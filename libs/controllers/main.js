const fp = require('fastify-plugin');

module.exports = fp(async (fastify, options) => {
  const trtc = fastify[options.trtcName];

  fastify.post(
    `${options.prefix}/call`,
    {
      onRequest: options.authenticate,
      schema: {
        description: '为 IM 通话签发 TRTC 进房参数。房间号由调用方传入，用户 ID 由 resolveUser 决定。',
        summary: '获取通话进房参数',
        body: {
          type: 'object',
          required: ['roomId'],
          properties: {
            roomId: { type: 'string', minLength: 1, maxLength: 48 }
          }
        }
      }
    },
    async request => {
      const roomId = String(request.body?.roomId || '');
      if (!/^[\w-]+$/.test(roomId)) {
        const error = new Error('房间号无效');
        error.statusCode = 400;
        throw error;
      }
      const userId = String((await options.resolveUser(request)) || '');
      if (!userId) {
        const error = new Error('无法确定通话用户');
        error.statusCode = 400;
        throw error;
      }
      const joinResult = await trtc.services.join({ roomId, userId });
      const sign = joinResult?.userSig || {};
      if (!sign.sdkAppId || !sign.userSig || !sign.userId) {
        const error = new Error('TRTC 签发失败');
        error.statusCode = 500;
        throw error;
      }
      return {
        sdkAppId: sign.sdkAppId,
        userId: sign.userId,
        userSig: sign.userSig,
        roomId: joinResult.roomId || roomId
      };
    }
  );
});
