const fp = require('fastify-plugin');
const { str, any, obj, success } = require('../schema/response');

module.exports = fp(async (fastify, options) => {
  const trtc = fastify[options.trtcName];

  fastify.post(
    `${options.prefix}/call`,
    {
      onRequest: options.authenticate,
      schema: {
        tags: ['IM-通话'],
        description: '为 IM 通话签发 TRTC 进房参数。房间号由调用方传入，用户 ID 由 resolveUser 决定（默认取 request.userInfo.id）。房间号含字母数字下划线连字符以外的字符或无法确定用户时返回 400，TRTC 签发结果不完整时返回 500。',
        summary: '获取通话进房参数',
        body: {
          type: 'object',
          required: ['roomId'],
          properties: {
            roomId: { type: 'string', minLength: 1, maxLength: 48, description: 'TRTC 房间号，只能包含字母、数字、下划线和连字符' }
          }
        },
        response: success(
          'TRTC 进房参数',
          obj('TRTC 进房参数', {
            sdkAppId: any('TRTC 应用 ID'),
            userId: any('进房使用的 TRTC 用户 ID'),
            userSig: str('TRTC 用户签名'),
            roomId: any('房间号')
          })
        )
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
