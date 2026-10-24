# バックエンド(タスク管理ボード API)

Spring Boot 4.1 / Java 25 / PostgreSQL 18 で構成する REST API。技術選定の理由は [基本設計書](../design.md#3-技術スタック) を参照。

## 前提ソフトウェア

| ソフトウェア | バージョン | インストール方法 |
|---|---|---|
| JDK | Eclipse Temurin 25 | `winget install EclipseAdoptium.Temurin.25.JDK` |
| Docker Desktop | 4.x | `winget install Docker.DockerDesktop`(WSL2 が必要。インストール後に再起動する) |

Gradle は Gradle Wrapper(`gradlew`)が自動でダウンロードするため、インストール不要。PostgreSQL は Docker のコンテナで動かすため、PC へのインストールは不要。

## データベースの準備

Docker Desktop を起動した状態で、リポジトリ直下([compose.yaml](../compose.yaml) がある場所)で次を実行する。初回はイメージをダウンロードし、アプリ用のユーザーとデータベース(どちらも `taskboard`)を自動で作成する。

```bash
docker compose up -d     # PostgreSQL を起動(バックグラウンド)
docker compose ps        # 状態の確認。STATUS が healthy なら準備完了
docker compose stop      # 停止(データは残る)
docker compose down -v   # コンテナとデータを削除して初期状態に戻す
```

DB の中身を見るときは `docker compose exec db psql -U taskboard -d taskboard` で psql に入れる。

テーブルはアプリの起動時に Flyway が作成する(`src/main/resources/db/migration`)。

| 項目 | 既定値 | 上書きする環境変数 |
|---|---|---|
| 接続先 | `jdbc:postgresql://localhost:5432/taskboard` | `DB_URL` |
| ユーザー | `taskboard` | `DB_USERNAME` |
| パスワード | `taskboard` | `DB_PASSWORD` |

既定値はローカル開発専用。ポートは 127.0.0.1 だけに公開しているため、他の PC からは接続できない。

## 起動・テスト

先に「データベースの準備」の `docker compose up -d` で PostgreSQL を起動しておく。

```bash
./gradlew bootRun   # アプリを起動(http://localhost:8080)
./gradlew test      # テストを実行(Docker の PostgreSQL に接続する)
```

起動後、<http://localhost:8080/actuator/health> を開いて `"status":"UP"` が返れば、DB 接続を含めて正常に動いている。

### NAS 上で実行するときの注意

プロジェクトを `\\nas\...` のネットワークパスに置いている場合、コマンドプロンプト(cmd.exe)は UNC パスをカレントディレクトリにできないため、`gradlew.bat` が正しく動かない。次のいずれかの方法で実行する。

- Git Bash から `./gradlew` を実行する
- NAS をネットワークドライブ(例:`Z:`)に割り当て、そのドライブ上で `gradlew.bat` を実行する
- IDE(IntelliJ IDEA / VS Code)の Gradle 連携から実行する
