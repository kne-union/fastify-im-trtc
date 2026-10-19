const { expect } = require('chai');
const fastify = require('fastify');
const fp = require('fastify-plugin');
const imTrtc = require('../index');

const registerTrtc = (join = async ({ roomId, userId }) => ({ roomId, userSig: { sdkAppId: 1400000001, userId, userSig: `sig-${userId}` } })) =>
  fp(
    async instance => {
      instance.decorate('trtc', { services: { join } });
    },
    { name: 'fastify-trtc' }
  );

const registerIm = () =>
  fp(
    async instance => {
      instance.decorate('im', { services: {} });
    },
    { name: 'fastify-im' }
  );

const buildApp = async (options, { join, withIm = true } = {}) => {
  const app = fastify();
  await app.register(registerTrtc(join));
  if (withIm) {
    await app.register(registerIm());
  }
  await app.register(imTrtc, Object.assign({ prefix: '/api/v1/im', authenticate: [] }, options));
  await app.ready();
  return app;
};

describe('@kne/fastify-im-trtc', function () {
  it('should sign a call room with resolveUser', async () => {
    const seen = [];
    const app = await buildApp(
      {
        resolveUser: async request => {
          seen.push(request.body.roomId);
          return 'im_9';
        }
      },
      {
        join: async ({ roomId, userId }) => {
          seen.push(`${roomId}:${userId}`);
          return { roomId, userSig: { sdkAppId: 1400000001, userId, userSig: 'signed' } };
        }
      }
    );
    const response = await app.inject({ method: 'POST', url: '/api/v1/im/call', payload: { roomId: 'imcall-1' } });
    expect(response.statusCode).to.equal(200);
    expect(response.json()).to.deep.equal({
      sdkAppId: 1400000001,
      userId: 'im_9',
      userSig: 'signed',
      roomId: 'imcall-1'
    });
    expect(seen).to.deep.equal(['imcall-1', 'imcall-1:im_9']);
    await app.close();
  });

  it('should reject an invalid room id', async () => {
    const app = await buildApp({ resolveUser: async () => 'user-1' });
    const response = await app.inject({ method: 'POST', url: '/api/v1/im/call', payload: { roomId: 'bad room' } });
    expect(response.statusCode).to.equal(400);
    await app.close();
  });

  it('should use request.userInfo when resolveUser is omitted', async () => {
    const app = fastify();
    await app.register(registerTrtc());
    await app.register(registerIm());
    app.addHook('onRequest', async request => {
      request.userInfo = { id: 'account-user' };
    });
    await app.register(imTrtc, { prefix: '/api/v1/im', authenticate: [] });
    await app.ready();
    const response = await app.inject({ method: 'POST', url: '/api/v1/im/call', payload: { roomId: 'room1' } });
    expect(response.statusCode).to.equal(200);
    expect(response.json().userId).to.equal('account-user');
    await app.close();
  });

  it('should reject when resolveUser returns an empty id', async () => {
    const app = await buildApp({ resolveUser: async () => '' });
    const response = await app.inject({ method: 'POST', url: '/api/v1/im/call', payload: { roomId: 'room1' } });
    expect(response.statusCode).to.equal(400);
    await app.close();
  });

  it('should fail when TRTC sign is incomplete', async () => {
    const app = await buildApp({ resolveUser: async () => 'user-1' }, { join: async ({ roomId }) => ({ roomId, userSig: {} }) });
    const response = await app.inject({ method: 'POST', url: '/api/v1/im/call', payload: { roomId: 'room1' } });
    expect(response.statusCode).to.equal(500);
    await app.close();
  });

  it('should run the authenticate hook before signing', async () => {
    const app = await buildApp({
      resolveUser: async () => 'user-1',
      authenticate: [
        async (request, reply) => {
          reply.code(401);
          return reply.send({ message: 'unauthorized' });
        }
      ]
    });
    const response = await app.inject({ method: 'POST', url: '/api/v1/im/call', payload: { roomId: 'room1' } });
    expect(response.statusCode).to.equal(401);
    await app.close();
  });

  it('should fail to start when fastify-im is missing', async () => {
    const app = fastify();
    await app.register(registerTrtc());
    app.register(imTrtc, { prefix: '/api/v1/im', authenticate: [] });
    try {
      await app.ready();
      expect.fail('should have thrown');
    } catch (error) {
      expect(error.message).to.include('fastify-im');
    }
    await app.close();
  });
});
