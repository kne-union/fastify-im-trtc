# @kne/fastify-im-trtc

把 IM 通话进房接到已注册的 `@kne/fastify-trtc`。插件不读取会议成员，也不生成 TRTC 密钥；`userId` 由业务的 `resolveUser` 决定，签名调用 `fastify.trtc.services.join`。

`@kne/fastify-im` 在传入 `trtc` 选项时注册本插件。请先注册 `@kne/fastify-trtc`。

```javascript
fastify.register(require('@kne/fastify-trtc'), trtcOptions);
fastify.register(require('@kne/fastify-im'), {
  prefix: '/api/v1/im',
  trtc: {
    authenticate: [authenticate],
    resolveUser: async request => String(request.userInfo.id)
  }
});
```

签发接口为 `POST {prefix}/call`。请求体 `{ roomId }`，成功时返回 `sdkAppId`、`userId`、`userSig`、`roomId`。

不传 `resolveUser` 时使用 `request.userInfo.id`。不传 `authenticate` 时使用 `fastify.account.authenticate.user`。
