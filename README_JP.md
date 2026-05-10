<p align="center">
  <img src="./rimecraft.svg" width="128" height="128" alt="RimeCraft Logo">
</p>

<h1 align="center">RimeCraft</h1>

<p align="center">
  <a href="https://github.com/phaserjs/phaser">Phaser.js</a> ベースの AI 対話型ゲーム制作ツール。<br>
  自然言語でゲームのアイデアを記述すると、AI エージェントが協調して Phaser ゲームのコード作成、デバッグ、リアルタイムプレビューを行います。
</p>

<img width="957" height="632" alt="image" src="https://github.com/user-attachments/assets/59615cd3-bedf-4dab-8b25-19c55ecb12a8" />
<img width="1062" height="628" alt="image" src="https://github.com/user-attachments/assets/9396a45a-a977-4679-90f0-0472695b5b51" />

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
```

## コマンド

| コマンド          | 説明                           |
| ----------------- | ------------------------------ |
| `bun dev`         | すべての開発サーバーを起動     |
| `bun dev:web`     | Web 開発サーバーを起動         |
| `bun dev:tauri`   | Tauri デスクトップ開発を起動   |
| `bun build`       | すべてのパッケージとアプリをビルド |
| `bun build:web`   | Web アプリをビルド             |
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

<img width="966" height="748" alt="image" src="https://github.com/user-attachments/assets/3d1e200d-c9ba-4721-9c0f-b2859687c697" />

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
