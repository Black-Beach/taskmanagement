# バックエンド(タスク管理ボード API)

Spring Boot 4.1 / Java 25 / PostgreSQL 18 で構成する REST API。技術選定の理由は [基本設計書](../design.md#3-技術スタック) を参照。

## 前提ソフトウェア

| ソフトウェア | バージョン | インストール方法 |
|---|---|---|
| JDK | Eclipse Temurin 25 | `winget install EclipseAdoptium.Temurin.25.JDK` |
| PostgreSQL | 18 | EDB のインストーラー(後述の注意点を参照) |

Gradle は Gradle Wrapper(`gradlew`)が自動でダウンロードするため、インストール不要。

### PostgreSQL インストール時の注意

Windows のユーザー名に日本語や空白が含まれていると、EDB のインストーラーが一時フォルダのパスを扱えずに失敗する(winget 経由でも同じ)。その場合は、英数字だけのフォルダを一時フォルダに指定して、管理者権限の PowerShell からインストーラーを実行する。

```powershell
$env:TEMP = 'C:\Users\Public\pgsetup-tmp'; $env:TMP = $env:TEMP
New-Item -ItemType Directory -Force $env:TEMP
.\postgresql-18.x-windows-x64.exe
```

## データベースの準備

PostgreSQL の管理ユーザー(postgres)で、アプリ用のユーザーとデータベースを作成する。

```powershell
& 'C:\Program Files\PostgreSQL\18\bin\psql.exe' -h localhost -U postgres `
  -c "CREATE ROLE taskboard LOGIN PASSWORD 'taskboard';" `
  -c "CREATE DATABASE taskboard OWNER taskboard ENCODING 'UTF8' TEMPLATE template0 LOCALE 'C';"
```

テーブルはアプリの起動時に Flyway が作成する(`src/main/resources/db/migration`)。

| 項目 | 既定値 | 上書きする環境変数 |
|---|---|---|
| 接続先 | `jdbc:postgresql://localhost:5432/taskboard` | `DB_URL` |
| ユーザー | `taskboard` | `DB_USERNAME` |
| パスワード | `taskboard` | `DB_PASSWORD` |

既定値はローカル開発専用。

## 起動・テスト

```bash
./gradlew bootRun   # アプリを起動(http://localhost:8080)
./gradlew test      # テストを実行(ローカルの PostgreSQL に接続する)
```

起動後、<http://localhost:8080/actuator/health> を開いて `"status":"UP"` が返れば、DB 接続を含めて正常に動いている。

### NAS 上で実行するときの注意

プロジェクトを `\\nas\...` のネットワークパスに置いている場合、コマンドプロンプト(cmd.exe)は UNC パスをカレントディレクトリにできないため、`gradlew.bat` が正しく動かない。次のいずれかの方法で実行する。

- Git Bash から `./gradlew` を実行する
- NAS をネットワークドライブ(例:`Z:`)に割り当て、そのドライブ上で `gradlew.bat` を実行する
- IDE(IntelliJ IDEA / VS Code)の Gradle 連携から実行する
