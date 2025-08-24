# FlightChord データ追加・更新手順書

## 🎯 目的
別の担当者が迷わずデータ追加・更新を実行できるよう、ステップバイステップで手順を記載。

---

## 📋 事前準備

### 必要な知識
- JSON形式の基本理解
- ターミナル/コマンドライン操作
- 空港・航空会社の基本知識（IATA/ICAOコード）

### 必要なツール
```bash
# 開発環境セットアップ
git clone [repository_url]
cd flightchord
pnpm install

# 検証コマンドの確認
pnpm run validate-data
```

---

## 🛫 1. 新規空港の追加

### Step 1: 空港情報の調査
```bash
# 1.1 基本情報収集
空港名（日本語・英語）
IATAコード（3文字）例: KKJ
ICAOコード（4文字）例: RJFR  
座標（緯度・経度）
所在地・地域
```

### Step 2: 空港データファイル作成
```bash
# 1.2 ファイル作成
touch public/data/airports/[IATA].json

# 例: 北九州空港の場合
touch public/data/airports/KKJ.json
```

### Step 3: 基本構造の作成
```json
{
  "airport": "KKJ",
  "updatedAt": "2025-08-24",
  "source": [
    {
      "url": "https://www.kitakyu-air.jp/rev-boarding/timetable.php",
      "lastChecked": "2025-08-24",
      "description": "[空港名]公式時刻表"
    }
  ],
  "carriers": {
    // 航空会社データはStep 4で追加
  }
}
```

### Step 4: 就航航空会社の調査
```bash
# 1.3 空港公式サイトで運航情報確認
# チェック項目:
# - 国内線運航キャリア
# - 国際線運航キャリア  
# - コードシェア情報
# - 運休路線情報
```

### Step 5: airports.jsonへの追加
```json
// public/data/airports.json に追加
"KKJ": {
  "iata": "KKJ",
  "icao": "RJFR", 
  "name": "北九州空港",
  "lat": 33.8459,
  "lon": 131.0347,
  "iso_country": "JP",
  "city": "Kitakyushu"
}
```

### Step 6: カバレッジデータへの追加
```typescript
// src/lib/coverage-data.ts の ALL_AIRPORTS に追加
KKJ: {
  iata: 'KKJ', icao: 'RJFR', name: '北九州空港', nameEn: 'Kitakyushu Airport',
  status: 'implemented', region: 'kyushu', type: 'regional'
}
```

---

## ✈️ 2. 新規航空会社の追加

### Step 1: 航空会社情報の調査
```bash
# 2.1 基本情報収集
航空会社名（日本語・英語）
IATAコード（2文字）例: LJ
ICAOコード（3文字）例: JNA
航空会社タイプ（major/lcc/regional/commuter）
本拠地空港
```

### Step 2: カバレッジデータへの追加
```typescript
// src/lib/coverage-data.ts の ALL_AIRLINES に追加
LJ: {
  iata: 'LJ', icao: 'JNA', name: 'ジンエアー', nameEn: 'Jin Air',
  status: 'implemented', type: 'lcc'
}
```

---

## 🔗 3. 路線データの追加

### Step 1: 路線情報の調査
```bash
# 3.1 確認項目
出発空港・到着空港
便数（1日当たり）
国内線/国際線の区別
コードシェアの有無
公式ソース（時刻表URL）
```

### Step 2: 空港ファイルへの路線追加
```json
// public/data/airports/[FROM].json
"carriers": {
  "[CARRIER_CODE]": {
    "destinations": [
      {
        "iata": "[TO_AIRPORT]",
        "freq_per_day": 6, // または null
        "intl": false, // または true
        "note": "コードシェア with [PARTNER]", // 必要に応じて
        "sources": [
          {
            "title": "[航空会社]公式時刻表",
            "url": "https://[official_url]"
          }
        ],
        "lastChecked": "2025-08-24"
      }
    ]
  }
}
```

### Step 3: 双方向路線の確保
```bash
# 3.2 重要: 必ず両方向の路線を作成
# FROM → TO の路線を作ったら
# TO → FROM の路線も作成する

# 例: HND→KKJ を作ったら KKJ→HND も作成
```

---

## 🔍 4. 検証・テスト

### Step 1: データ検証の実行
```bash
# 4.1 基本検証
pnpm run validate-data

# エラーが出た場合の対応:
# - Missing bidirectional route: 双方向路線を追加
# - Missing source attribution: sources配列を追加  
# - Invalid file structure: JSON構文を確認
```

### Step 2: 双方向路線の自動修正
```bash
# 4.2 双方向路線エラーの修正
pnpm run fix-bidirectional

# 手動確認も必要:
# - 修正内容が正しいか確認
# - 意図しない路線が追加されていないか確認
```

### Step 3: ソース属性の自動追加
```bash
# 4.3 ソース不足の修正
pnpm run add-sources

# 注意: 自動生成されたソースURLは要確認
# プレースホルダー（example.com）は手動修正が必要
```

---

## 📤 5. 本番反映

### Step 1: 最終検証
```bash
# 5.1 完全なデータ検証
pnpm run validate-data
# → 0 errors, 0 warnings になることを確認

# 5.2 ビルドテスト
pnpm run build
# → エラーなく完了することを確認
```

### Step 2: コミット・プッシュ
```bash
# 5.3 変更をコミット
git add .
git commit -m "feat: add [空港名/航空会社名] routes with official sources"
git push
```

---

## 🚨 よくあるエラーと対処法

### JSON構文エラー
```bash
# 症状: validate-data でJSON parsing error
# 対処: JSONフォーマッターで構文チェック
# ツール: https://jsonlint.com/
```

### 双方向路線エラー  
```bash
# 症状: Missing bidirectional route
# 対処: 両方向の空港ファイルに路線を追加
# 例: HND→KKJ なら KKJ→HND も必要
```

### カバレッジ不整合
```bash
# 症状: Coverage mismatch
# 対処: ALL_AIRPORTS と実際のファイル数を一致させる
# 確認: coverage-data.ts の status: 'implemented'
```

### 新規航空会社未認識
```bash
# 症状: 航空会社コードが認識されない
# 対処: coverage-data.ts の ALL_AIRLINES に追加
```

---

## ✅ 完了チェックリスト

### 空港追加時
- [ ] public/data/airports/[CODE].json 作成
- [ ] public/data/airports.json に空港情報追加  
- [ ] src/lib/coverage-data.ts に空港情報追加
- [ ] 就航キャリアの路線データ追加
- [ ] validate-data でエラーなし
- [ ] 本番環境で動作確認

### 航空会社追加時  
- [ ] src/lib/coverage-data.ts に航空会社情報追加
- [ ] 該当空港ファイルに路線データ追加
- [ ] validate-data でエラーなし
- [ ] 双方向路線の整合性確認

### 路線追加時
- [ ] 出発空港ファイルに路線追加
- [ ] 到着空港ファイルに逆方向路線追加
- [ ] 公式ソース情報の追加
- [ ] validate-data でエラーなし
- [ ] 実際の画面で路線表示確認

---

## 📞 困ったときの連絡先

**重要**: この手順書で解決できない問題が発生した場合:
1. GitHub Issuesで問題を報告
2. 現在の作業状況を詳細に記録
3. エラーメッセージの完全なコピーを保存

**この手順書の更新**: 新しいパターンやエラーを発見したら、随時この文書を更新してください。