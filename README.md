# 日本代表ワールドカップ・ストーリーテリングマップ

サッカー日本代表のワールドカップにまつわる12の出来事を、MapLibre GL JS による3Dマップ上で自動的に巡るストーリーテリングマップです。

## 公開URL
https://furuhashilab.github.io/Design1/

## 構成

- `index.html` — エントリーポイント
- `style.css` — スタイル（スタジアムナイトをイメージした配色）
- `story-data.js` — 12シーンのデータ（年・場所・座標・カメラのpitch/bearing/zoom・解説文）
- `main.js` — MapLibre GL JS の初期化、3D建物レイヤー、自動カメラフライスルー、自動ポップアップ、年表レール（右側UI）、進行バーの制御

## 操作方法

- **前へ／次へボタン**: シーンを手動で1つずつ切り替えます
- **自動再生ボタン**: クリックすると現在のシーンから自動でシーンが進みます（再度クリックで一時停止）
- **右側の年表レール**: 年のドットを直接クリックすると、そのシーンへジャンプします
- **キーボード**: 左右の矢印キーでも手動切り替えができます
- シーンに到着すると、対戦国・スコア・日付を含むポップアップとカード情報が自動的に表示されます

## 技術仕様

- **3D表現**: `fill-extrusion` レイヤーによる3D建物表示
- **地図データ**: [OpenFreeMap](https://openfreemap.org/)（`liberty` スタイル、OpenStreetMapベース、利用無料・APIキー不要）
- **カメラワーク**: 各シーンで `pitch` は55〜64度に設定し、直下視（真上からの視点）は使用していません。シーン間は `flyTo` で自動移動し、滞在中も `bearing` を自動でゆっくり回転させています。
- **ポップアップ**: 各シーン到着時に自動的にMapLibreのPopupを表示（クリック等のユーザー操作不要）
- **シーン数**: 12シーン（1993年ドーハ〜2022年カタール）
- **ライブラリ**: MapLibre GL JS（CDN経由、ビルド不要の静的サイト）

## カスタマイズ

- シーンの内容や座標は `story-data.js` の `STORY` 配列を編集してください。
- 各シーンの滞在時間やカメラの移動時間は `main.js` 先頭の `DWELL_MS` / `FLY_MS` / `ORBIT_DEG` で調整できます。

## 帰属・ライセンス

地図上の帰属表示を削除しないでください。

- 地図ライブラリ: [MapLibre GL JS](https://maplibre.org/)（BSD-3-Clause License）
- 地図スタイル・タイル: [OpenFreeMap](https://openfreemap.org/)
- ベクタータイル: © [OpenMapTiles](https://openmaptiles.org/)（ODbL License）
- 地図データ: © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors（ODbL License）
