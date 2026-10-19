const fp = require('fastify-plugin');
const path = require('node:path');

const defaultResolveUser = async request => {
  const userId = request.userInfo?.id || request.user?.id;
  if (!userId) {
    const error = new Error('无法确定通话用户');
    error.statusCode = 401;
    throw error;
  }
  return String(userId);
};

module.exports = fp(
  async (fastify, options) => {
    options = Object.assign(
      {
        name: 'imTrtc',
        imName: 'im',
        trtcName: 'trtc',
        prefix: '',
        resolveUser: defaultResolveUser
      },
      options
    );

    if (!options.prefix) {
      throw new Error('fastify-im-trtc 需要 prefix');
    }
    if (!fastify[options.imName]) {
      throw new Error('fastify-im 未注册，无法连接通话');
    }
    const trtc = fastify[options.trtcName];
    if (!trtc?.services?.join) {
      throw new Error('fastify-trtc 未注册，无法连接通话');
    }
    if (!Object.prototype.hasOwnProperty.call(options, 'authenticate')) {
      if (!fastify.account?.authenticate?.user) {
        throw new Error('fastify-im-trtc 需要 authenticate，或先注册 fastify-account');
      }
      options.authenticate = [fastify.account.authenticate.user];
    }

    fastify.register(require('@kne/fastify-namespace'), {
      options,
      name: options.name,
      modules: [['controllers', path.resolve(__dirname, './libs/controllers')]]
    });
  },
  {
    name: 'fastify-im-trtc',
    dependencies: ['fastify-trtc']
  }
);
