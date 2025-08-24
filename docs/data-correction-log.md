# FlightChord データ是正作業ログ

**作業日**: 2025-08-24  
**担当者**: Claude Code  
**作業種別**: ダミーデータ廃止 → 公式ソース準拠への全面移行  

## 📋 是正の背景

### 問題の発覚
- ユーザーから「スターフライヤーでFUKがないのはなんで？北九州空港もあるんでは？」の指摘
- データ取得プロセスの根本的見直しが必要と判断

### 従来手法の問題点
❌ **手動推測によるダミーデータ作成**  
❌ 実際のAPI連携なし  
❌ 公式時刻表の確認なし  
❌ 検証プロセス皆無  

## 🔍 調査結果：スターフライヤー(7G/SFJ)

### 公式ソース確認
1. **スターフライヤー公式時刻表** (https://www.starflyer.jp/timetable/)
2. **北九州空港公式サイト** (https://www.kitakyu-air.jp/)

### 実際の2025年運航路線
✅ **HND ⇄ KKJ** (羽田⇄北九州) - 4便/日確認  
✅ **HND ⇄ FUK** (羽田⇄福岡)  
✅ **HND ⇄ KIX** (羽田⇄関西)  
✅ **NGO ⇄ FUK** (中部⇄福岡)  
✅ **HND ⇄ UBJ** (羽田⇄山口宇部)  
✅ **FUK ⇄ SDJ** (福岡⇄仙台)  

### ダミーデータの誤り
❌ KKJ-FUK (存在しない)  
❌ KKJ-KIX (存在しない)  
❌ KKJ-NGO (存在しない)  
❌ **HND-FUK欠如** (実在するが未実装)  

## 🚀 新データ運用方針

### データソース階層
1. **一次情報**: 航空会社・空港公式サイト
2. **統計裏取り**: 国土交通省航空輸送統計 (e-Stat)
3. **ブートストラップ**: OurAirports(CC0), OpenFlights(ODbL)
4. **頻度補強**: AeroDataBox API

### 必須データ構造
```json
{
  "airport": "HND",
  "updatedAt": "2025-08-24",
  "carriers": {
    "SFJ": {
      "destinations": [{
        "iata": "KKJ",
        "freq_per_day": 4,
        "intl": false,
        "sources": [
          {
            "title": "スターフライヤー公式時刻表",
            "url": "https://www.starflyer.jp/timetable/"
          },
          {
            "title": "北九州空港公式サイト",
            "url": "https://www.kitakyu-air.jp/"
          }
        ],
        "lastChecked": "2025-08-24"
      }]
    }
  },
  "meta": {
    "bootstrappedFrom": [
      {"title": "OurAirports", "url": "https://ourairports.com/data/"},
      {"title": "OpenFlights", "url": "https://openflights.org/data.php"}
    ]
  }
}
```

### バリデーションルール
- `destinations[].sources.length >= 1` 必須
- `sources[].url` ドメインホワイトリスト適用
- 公式に矛盾するデータは除外

## 📝 作業実績 (2025-08-24)

### 完了
- [x] スターフライヤー公式時刻表調査
- [x] 北九州空港公式サイト裏取り
- [x] HND⇄KKJ路線データ修正 (sources付き)
- [x] 誤路線削除 (KKJ-FUK, KKJ-KIX, KKJ-NGO)

### 進行中
- [ ] HND⇄FUK路線追加
- [ ] 山口宇部空港(UBJ)追加
- [ ] 福岡⇄仙台(FUK-SDJ)路線追加
- [ ] 全航空会社の同様調査

### 次回作業予定
- [ ] GitHub Actions自動パイプライン構築
- [ ] OurAirports API統合
- [ ] ライセンス帰属表記

## 🔗 参考URL

### 公式ソース
- [スターフライヤー時刻表](https://www.starflyer.jp/timetable/)
- [北九州空港公式](https://www.kitakyu-air.jp/)
- [国交省統計](https://www.e-stat.go.jp/stat-search/files?toukei=00600360&tstat=000001018894)

### オープンデータ
- [OurAirports](https://ourairports.com/data/)
- [OpenFlights](https://openflights.org/data.php)
- [AeroDataBox](https://doc.aerodatabox.com/)

---
**重要**: 今後一切のダミーデータ作成を禁止し、必ず複数の公式ソース裏取りを必須とする。