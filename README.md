# vc-mihari

Discord のボイスチャンネルの在室状況を Slack に通知する常駐 Bot です。

ボイスチャンネルに人が出入りするたびに、その時点の在室人数とメンバー名を Slack に流します。「ボイチャに3人居ます: A, B, C」のように通知が届くので、Slack を見ているだけで通話に人が集まっているかが分かります。

Slack を連絡のメインに使っていて、Discord は通話用にだけ使っている、という組織向けです。Discord を常時開いていないと通話が始まったことに気づけない、という状況を解消します。

## 通知の内容

- 人数だけでなく、在室メンバーの表示名を一覧します。表示名が取得できないメンバーがいる場合は人数のみの表示にフォールバックします。
- Slack への通知は Block Kit を使っており、取得できたメンバーのアバターアイコンを並べて表示します。
- 通知文言は「誰もいなくなった」「最初の1人が来た」「大人数」といった状況ごとに `messages.js` に定義した定型文からランダムに選ばれます。LLMでメッセージの生成は行っていない。

## 必要なもの

- Node.js 20.6 以上（`--env-file` オプションを使うため）
- Discord Bot のトークン
- Slack の Incoming Webhook URL

## セットアップ

```
npm install
cp .env.example .env
```

`.env` を開いて値を埋めます。

| 変数 | 内容 |
| --- | --- |
| `DISCORD_TOKEN` | Discord Developer Portal で発行した Bot Token |
| `SLACK_WEBHOOK_URL` | Slack の Incoming Webhook URL |
| `TARGET_CHANNEL_ID` | 監視するボイスチャンネルの ID |

起動:

```
node --env-file=.env bot.js
```

### Discord 側の設定

Discord Developer Portal で Bot を作成し、次の設定をします。

- Bot タブで **Server Members Intent** をオンにする
- サーバーへの招待時に必要な権限は **View Channels** のみ

ボイスチャンネルの ID は、Discord の設定で開発者モードを有効にしたうえで、チャンネルを右クリックして「ID をコピー」で取得できます。

### Slack 側の設定

Slack App を作成して Incoming Webhook を有効にし、通知先チャンネルを選んで Webhook URL を発行します。

## 通知文言のカスタマイズ

`messages.js` に状況ごとの文言が配列で定義されています。追加したい場合は該当カテゴリの配列に文字列を1つ足すだけです。

使えるプレースホルダ:

- `{count}` … 在室人数
- `{names}` … 在室メンバーの表示名を「、」で連結したもの

`{names}` を含む文言は、メンバー名が取得できなかった場合には選ばれません。そのため**各カテゴリには `{names}` を含まない文言を最低1つ残しておく**必要があります。

カテゴリは4つです。

| カテゴリ | 条件 |
| --- | --- |
| `empty` | 在室0人になった |
| `firstJoin` | 誰もいないところに最初の1人が来た |
| `large` | 5人以上 |
| `small` | それ以外 |


## 開発

通知メッセージの組み立て（`notification.js`）は Discord にも Slack にも接続しないので、単体でテストできます。

```
node test-notification.js
```

文言を追加・修正したら、このテストを実行して全て成功することを確認してからコミットしてください。

試すときは**通知先を必ずテスト用の Slack チャンネルに向けてください**。運用中の Webhook URL をそのまま `.env` に入れると、動作確認の通知が本番のチャンネルに飛びます。

## 常駐させる (systemd)

`deploy/vc-mihari.service` を雛形として用意しています。`User`、`WorkingDirectory`、`ExecStart` のパスを環境に合わせて書き換えてから設置してください。

```
sudo cp deploy/vc-mihari.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now vc-mihari
```

ログの確認:

```
journalctl -u vc-mihari -f
```

`.env` にトークンを置くので、リポジトリを配置するディレクトリと `.env` のパーミッションには注意してください。

## 名前の由来

Discord のボイスチャンネルを見張る側なので「みはり」と名付けました。みはりといえば『お兄ちゃんはおしまい!』の緒山みはりだろう、ということで、通知を受け取る Slack 側は兄でもあり妹でもある「まひろ」ということになっています。

- [お兄ちゃんはおしまい! 公式サイト](https://onimai.jp/)


