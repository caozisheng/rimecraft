<p align="center">
  <img src="./rimecraft.svg" width="128" height="128" alt="RimeCraft Logo">
</p>

<h1 align="center">RimeCraft</h1>

<p align="center">
  <a href="https://github.com/phaserjs/phaser">Phaser.js</a> ベースの AI 対話型ゲーム制作ツール。<br>
  自然言語でゲームのアイデアを記述すると、AI エージェントが協調して Phaser ゲームのコード作成、デバッグ、リアルタイムプレビューを行います。
</p>

<img width="2008" height="1256" alt="image" src="https://github.com/user-attachments/assets/c668846f-2af2-45c3-b2a6-a1a3d2ce0c81" />

<img width="955" height="748" alt="image" src="https://github.com/user-attachments/assets/9c642f34-af2c-447b-821f-2c889381bbaa" />

<img width="960" height="750" alt="image" src="https://github.com/user-attachments/assets/c0a6ffb1-1bd8-49ea-b767-00b7dba646a7" />

<img width="957" height="745" alt="image" src="https://github.com/user-attachments/assets/1b5fd326-75fc-4fee-8778-f0d9ce342631" />

<img width="955" height="746" alt="image" src="https://github.com/user-attachments/assets/5ca00f53-c433-48dc-854b-201c0be2440c" />


## 機能

- **チャット駆動のゲーム制作** — 自然言語でゲームを記述。マルチエージェントエンジンがコードを作成・反復
- **ライブプレビュー** — Phaser ゲームがサンドボックス iframe 内でコンパイル・実行され、チャットしながら確認可能
- **6 つの組み込みテンプレート** — エンドレスランナー、プラットフォーマー、シューティング、RPG、パズル（2048）、ブロック崩し、空のプロジェクトも用意。アセットは <a href="https://github.com/channingbreeze/games">channingbreeze/games</a> より
- **アセットライブラリ** — 40 以上の組み込みアセット、プレビュー・検索・アップロード・AI 生成に対応
- **ビジュアルシーンエディタ** — ドラッグ＆ドロップのシーングラフエディタ、インスペクタと自動保存付き
- **ターンレベルの取り消し** — コンテキストを失わずに任意のエージェントターンをロールバック
- **クリック可能なオプション** — エージェントの返答にインタラクティブな提案が含まれ、クリックで続行可能
- **自動エラー検出** — ランタイムエラーを自動的にキャッチし、エージェントにフィードバックして自己修復
- **RAG 強化 AI** — Phaser 4 公式スキルナレッジベース（34 ドメイン）、API インデックス、アーキテクチャパターン、エラー修正ライブラリ、ドキュメントガイドによる高品質コード生成
- **マルチプロバイダー LLM ルーティング** — 統一設定ストアによる設定可能な LLM プロバイダー
- **国際化** — 中国語 / 英語 / 日本語の完全な UI とゲームテンプレートローカライゼーション
- **チャット履歴の永続化** — 会話はプロジェクトごとに IndexedDB に自動保存され、再度開くと復元
- **デスクトップアプリ** — Tauri ベースのネイティブデスクトップビルド、エクスポート対応
- **OpenAI 互換 API** — OpenAI、Claude、DeepSeek、Ollama、その他互換プロバイダーに対応

## プロジェクト構成

```
rimecraft/
├── apps/
│   ├── web/          # Next.js Web アプリ（メインエントリ）
│   ├── tauri/        # Tauri デスクトップアプリ
│   └── docs/         # ドキュメント
├── packages/
│   ├── core/         # コアタイプ、ツール、ゲームコンパイラ
│   ├── agent-engine/ # AI マルチエージェントチャットエンジン
│   ├── phaser-runtime/ # Phaser.js ランタイムブリッジ
│   ├── ui/           # 共有 UI コンポーネント（Radix UI）
│   └── code-editor/  # Monaco コードエディタ
```

## 前提条件

- **Node.js** >= 20
- **Bun** >= 1.2
- **Rust ツールチェーン**（Tauri デスクトップ版のみ）

```bash
# Linux & MacOS
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Windows
winget install Rustlang.Rustup
```

## はじめに

### Web

```bash
# 依存関係のインストール
bun install

# 開発サーバーの起動
bun dev:web

# http://localhost:3000 を開く
```

### デスクトップ（Tauri）

```bash
# 開発
bun run dev:tauri

# リリースビルド
bun run build:tauri

# Linux x64
bun run build:tauri:linux-x64

# Linux ARM64
bun run build:tauri:linux-arm64

# macOS Apple Silicon
bun run build:tauri:macos-arm64

# macOS Intel
bun run build:tauri:macos-x64

# macOS Universal (Apple Silicon + Intel)
bun run build:tauri:macos-universal
```

#### Linux システム依存パッケージ

Linux で Tauri デスクトップアプリをビルドするには、以下のシステムパッケージが必要です：

```bash
# Ubuntu / Debian
sudo apt install libwebkit2gtk-4.1-dev librsvg2-dev patchelf libssl-dev libayatana-appindicator3-dev

# Fedora
sudo dnf install webkit2gtk4.1-devel libappindicator-gtk3-devel librsvg2-devel patchelf openssl-devel libayatana-appindicator-gtk3-devel

# Arch Linux
sudo pacman -S webkit2gtk-4.1 libappindicator-gtk3 librsvg patchelf openssl ayatana-appindicator
```

## コマンド

| コマンド          | 説明                           |
| ----------------- | ------------------------------ |
| `bun dev`         | すべての開発サーバーを起動     |
| `bun dev:web`     | Web 開発サーバーを起動         |
| `bun dev:tauri`   | Tauri デスクトップ開発を起動   |
| `bun build`       | すべてのパッケージとアプリをビルド |
| `bun build:web`   | Web アプリをビルド             |
| `bun build:tauri`              | Tauri デスクトップをビルド（現在のプラットフォーム） |
| `bun build:tauri:linux-x64`    | Linux x86_64 向けビルド        |
| `bun build:tauri:linux-arm64`  | Linux ARM64 向けビルド         |
| `bun build:tauri:macos-arm64`  | macOS Apple Silicon 向けビルド |
| `bun build:tauri:macos-x64`    | macOS Intel 向けビルド         |
| `bun build:tauri:macos-universal`| macOS ユニバーサルビルド（ファットバイナリ） |
| `bun lint`        | Biome でリント                 |
| `bun lint:fix`    | リント問題を自動修正           |
| `bun format`      | コードをフォーマット           |
| `bun test`        | テストを実行                   |
| `bun clean`       | ビルド成果物をクリーン         |

## 技術スタック

- **Monorepo**: Turborepo + Bun workspaces
- **フロントエンド**: React 19 + Next.js 16 + TypeScript 5.8
- **スタイリング**: TailwindCSS 4 + Radix UI
- **状態管理**: Zustand 5
- **ゲームエンジン**: Phaser 4
- **デスクトップ**: Tauri 2
- **リンター**: Biome

## AI エージェント設定

アプリ内の設定ダイアログから BaseURL / API Key / モデル名を設定します。

任意の OpenAI 互換 API（OpenAI、Claude、DeepSeek、Ollama など）に対応しています。

<img width="2635" height="1767" alt="image" src="https://github.com/user-attachments/assets/1c9262de-3d1f-42c6-ac4c-ab5af0eb7ee0" />

## ファイルストレージ

RimeCraft は実行環境に応じて異なるストレージバックエンドを使用します。

### Web（ブラウザ）

すべてのデータは **IndexedDB** に保存されます。データベース名 `rimecraft`（バージョン 3）。

| ストア           | 内容                                   |
| ---------------- | -------------------------------------- |
| `projects`       | プロジェクトメタデータとマニフェスト   |
| `files`          | ソースファイル（キー: `projectId:path`）|
| `assets`         | バイナリアセット（画像、音声）         |
| `user_assets`    | ユーザーアップロードと AI 生成アセット |
| `chat_messages`  | プロジェクト別チャット履歴（自動保存） |

データはブラウザオリジンごとにスコープされ、ブラウザが自動管理します。ファイルシステムへのアクセスは不要です。

### Tauri（デスクトップ）

プロジェクトはローカルファイルシステムの OS **アプリデータディレクトリ**（`appDataDir`）に保存されます。識別子 `com.rimecraft.desktop`。

| プラットフォーム | パス                                                                |
| ---------------- | ------------------------------------------------------------------- |
| Windows          | `%APPDATA%\com.rimecraft.desktop\projects\`                         |
| macOS            | `~/Library/Application Support/com.rimecraft.desktop/projects/`     |
| Linux            | `~/.config/com.rimecraft.desktop/projects/`（または `$XDG_CONFIG_HOME`）|

各プロジェクトは以下を含むディレクトリです：

```
<project-id>/
├── rimecraft.json       # メタデータ + マニフェスト
├── src/                 # ソースファイル
└── assets/              # バイナリアセット（画像、音声）
```

エクスポートされた `.zip` ファイルはシステムファイルダイアログで保存され、デフォルトで OS の**ダウンロード**ディレクトリに保存されます。

## ライセンス

MIT
