# Webhook の設定とトラブルシューティング

## 問題：決済後も Order の status が PENDING のまま

### 症状
- Stripe Checkout で決済を完了
- 決済成功ページにリダイレクトされる
- しかし Prisma Studio で確認すると、`orders` テーブルの status が `PENDING` のまま
- `payments` テーブルにレコードが作成されていない

### 原因
**Webhook が動作していない**ため、Stripe からの決済完了通知を受け取れていません。

### 決済フローの詳細

#### 正常な流れ
1. ✅ ユーザーが「Buy Now」をクリック
2. ✅ `/api/checkout` が呼ばれ、Order が `PENDING` で作成される
3. ✅ Stripe Checkout Session が作成され、ユーザーがリダイレクトされる
4. ✅ ユーザーが Stripe Checkout で決済を完了
5. ✅ Stripe が `/api/webhook` に `checkout.session.completed` イベントを送信
6. ✅ Webhook ハンドラーが Order の status を `COMPLETED` に更新
7. ✅ Webhook ハンドラーが Payment レコードを作成

#### 問題がある場合の流れ
1. ✅ ユーザーが「Buy Now」をクリック
2. ✅ `/api/checkout` が呼ばれ、Order が `PENDING` で作成される
3. ✅ Stripe Checkout Session が作成され、ユーザーがリダイレクトされる
4. ✅ ユーザーが Stripe Checkout で決済を完了
5. ❌ Stripe が Webhook を送信しようとするが、localhost には届かない
6. ❌ Order の status が `PENDING` のまま
7. ❌ Payment レコードが作成されない

## 解決方法：Stripe CLI のセットアップ

ローカル環境では、Stripe からの Webhook を直接受け取ることができません。**Stripe CLI** を使って Webhook をローカルに転送する必要があります。

### 1. Stripe CLI のインストール

#### macOS (Homebrew)
```bash
brew install stripe/stripe-cli/stripe
```

#### macOS (直接ダウンロード)
```bash
# Intel Mac
curl -L https://github.com/stripe/stripe-cli/releases/latest/download/stripe_latest_mac-amd64.tar.gz -o stripe.tar.gz

# Apple Silicon Mac (M1/M2/M3)
curl -L https://github.com/stripe/stripe-cli/releases/latest/download/stripe_latest_mac-arm64.tar.gz -o stripe.tar.gz

# 解凍して PATH に配置
tar -xzf stripe.tar.gz
sudo mv stripe /usr/local/bin/
```

#### Linux
```bash
curl -L https://github.com/stripe/stripe-cli/releases/latest/download/stripe_latest_linux_amd64.tar.gz -o stripe.tar.gz
tar -xzf stripe.tar.gz
sudo mv stripe /usr/local/bin/
```

#### Windows
PowerShell で実行：
```powershell
scoop bucket add stripe https://github.com/stripe/scoop-stripe-cli.git
scoop install stripe
```

または公式サイトからダウンロード：
https://github.com/stripe/stripe-cli/releases

### 2. Stripe にログイン

```bash
stripe login
```

ブラウザが開くので、Stripe アカウントでログインして認証を完了してください。

### 3. Webhook をローカルに転送

**新しいターミナルウィンドウ**を開いて以下を実行：

```bash
stripe listen --forward-to localhost:3000/api/webhook
```

### 4. Webhook シークレットを取得・設定

上記コマンドを実行すると、以下のような出力が表示されます：

```
> Ready! Your webhook signing secret is whsec_xxxxxxxxxxxxxxxxxxxxx
```

この `whsec_xxxxxxxxxxxxxxxxxxxxx` をコピーして、`next-app/.env` ファイルを更新：

```env
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxx
```

### 5. 開発サーバーを再起動

環境変数を読み込むため、Next.js 開発サーバーを再起動：

```bash
# 開発サーバーを停止 (Ctrl+C)
# next-app ディレクトリで再起動
bun dev
```

### 6. 動作確認

#### 決済テストを実行

1. http://localhost:3000 にアクセス
2. メールアドレスを入力
3. 商品を購入
4. テストカード `4242 4242 4242 4242` で決済

#### Webhook の確認

Stripe CLI を実行しているターミナルで、以下のようなログが表示されるはずです：

```
2025-11-02 22:00:00   --> checkout.session.completed [evt_xxxxxxxxxxxxx]
2025-11-02 22:00:00   <-- [200] POST http://localhost:3000/api/webhook [evt_xxxxxxxxxxxxx]
```

- `-->` : Stripe からイベントを受信
- `<--` : Webhook ハンドラーからのレスポンス
- `[200]` : 正常に処理完了

#### データベースの確認

Prisma Studio で確認：

```bash
cd next-app
bunx prisma studio
```

http://localhost:5555 にアクセスして：

1. **orders テーブル**
   - 最新の注文の `status` が `COMPLETED` になっている

2. **payments テーブル**
   - 新しいレコードが作成されている
   - `status` が `SUCCEEDED` になっている
   - `paidAt` に日時が記録されている

## Webhook のテストコマンド

実際に決済しなくても、Webhook イベントをテストできます：

```bash
# checkout.session.completed イベントをトリガー
stripe trigger checkout.session.completed

# payment_intent.succeeded イベントをトリガー
stripe trigger payment_intent.succeeded

# checkout.session.expired イベントをトリガー
stripe trigger checkout.session.expired
```

## 本番環境での Webhook 設定

本番環境では、Stripe Dashboard から Webhook エンドポイントを設定します：

1. https://dashboard.stripe.com/webhooks にアクセス
2. 「エンドポイントを追加」をクリック
3. エンドポイント URL: `https://yourdomain.com/api/webhook`
4. リッスンするイベントを選択：
   - `checkout.session.completed`
   - `checkout.session.expired`
   - `payment_intent.payment_failed`
5. Webhook 署名シークレットをコピーして、本番環境の環境変数に設定

## トラブルシューティング

### Webhook が届かない

**Stripe CLI のログを確認：**
```bash
stripe listen --forward-to localhost:3000/api/webhook
```

ログに何も表示されない場合は、決済が完了していない可能性があります。

**Next.js のログを確認：**
開発サーバーのターミナルで、`/api/webhook` へのリクエストログを確認してください。

### Webhook シークレットが無効

```
Invalid signature
```

というエラーが出る場合：

1. `stripe listen` で表示された最新のシークレットを使用
2. `.env` ファイルを更新後、開発サーバーを必ず再起動
3. `.env` ファイルの場所が正しいか確認（`next-app/.env`）

### 複数の Stripe CLI セッション

複数のターミナルで `stripe listen` を実行している場合、競合が発生する可能性があります。

既存のセッションを終了してから、新しいセッションを開始してください。

## まとめ

- ローカル開発では **Stripe CLI が必須**
- `stripe listen` を実行し続ける必要がある
- Webhook シークレットは `stripe listen` 起動時に毎回生成される
- 本番環境では Stripe Dashboard から Webhook エンドポイントを設定

## 参考リンク

- [Stripe CLI ドキュメント](https://stripe.com/docs/stripe-cli)
- [Webhook のテスト](https://stripe.com/docs/webhooks/test)
- [Webhook のベストプラクティス](https://stripe.com/docs/webhooks/best-practices)
