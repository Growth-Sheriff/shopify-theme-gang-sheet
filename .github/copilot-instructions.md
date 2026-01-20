# 📚 FuncLib v4 - Kullanım Kılavuzu

> **Tree-sitter tabanlı evrensel kod analiz aracı**
> 
> Güncellenme: Ocak 2026

---

## ⚠️ KRİTİK SHOPIFY KURALLARI

### 🔴 ASLA DEĞİŞTİRME - Shopify Admin Ayarları
Shopify'a deploy yaparken **ASLA** şu dosyaları gönderme:
- `config/settings_data.json` - Shopify admin'de yapılan tüm ayarlar burada
- `templates/*.json` içindeki section ayarları (eğer Shopify'da düzenlendiyse)

### ✅ SADECE KOD DEĞİŞİKLİKLERİ GÖNDER
Shopify'a deploy yaparken sadece şu dosyaları gönder:
- `sections/*.liquid` - Section kodları
- `snippets/*.liquid` - Snippet kodları  
- `assets/*.css`, `assets/*.js` - Stil ve script dosyaları
- `layout/*.liquid` - Layout dosyaları
- `templates/*.liquid` - Liquid template dosyaları

### 📝 Deploy Komutu
```bash
# Sadece belirli dosyaları gönder (ayarları koruyarak)
shopify theme push --only sections/*.liquid --only snippets/*.liquid --only assets/* --only layout/*.liquid

# VEYA tek dosya gönder
shopify theme push --only sections/header.liquid
```

### 🚫 YASAK KOMUTLAR
```bash
# ASLA KULLANMA - Tüm ayarları ezer!
shopify theme push
shopify theme push --force
```

### 🚫 DOSYA SİLME YASAK
**ASLA komple dosya silme (Remove-Item, rm, del) kullanma!**
- Dosya içeriğini değiştirmek için `replace_string_in_file` veya `edit` kullan
- Yeni dosya oluşturmak için `create_file` kullan
- Var olan dosyayı güncellemek için içeriği düzenle, SİLME
- Eğer dosya "already exists" hatası verirse, `replace_string_in_file` ile güncelle

```bash
# ❌ YASAK
Remove-Item "dosya.js"
rm dosya.js
del dosya.js

# ✅ DOĞRU
# Dosya içeriğini replace_string_in_file ile güncelle
```

---

## 📋 İçindekiler

1. [Hızlı Başlangıç](#-hızlı-başlangıç)
2. [CLI Kullanımı](#-cli-kullanımı)
3. [REST API](#-rest-api)
4. [MCP Server (AI Entegrasyonu)](#-mcp-server)
5. [Copilot Instructions](#-copilot-instructions)
6. [Desteklenen Diller](#-desteklenen-diller)
7. [Konfigürasyon](#️-konfigürasyon)

---

## 🚀 Hızlı Başlangıç

### Kurulum

```bash
# Clone & Install
git clone https://github.com/Growth-Sheriff/funclip.git funclib
cd funclib
npm install
npm run build

# Global CLI (opsiyonel)
npm link
```

### İlk Kullanım

```bash
# 1. Projeyi indeksle
cd /path/to/your-project
funclib index

# 2. Sembol ara
funclib search handleSubmit

# 3. Referansları bul (EN ÖNEMLİ!)
funclib refs useEditorStore
```

---

## 💻 CLI Kullanımı

### Temel Komutlar

| Komut | Açıklama | Örnek |
|-------|----------|-------|
| `index` | Projeyi indeksle | `funclib index` |
| `search <query>` | Sembol ara | `funclib search handleClick` |
| `refs <name>` | Referansları bul | `funclib refs fetchData` |
| `symbol <name>` | Sembol detayı | `funclib symbol UserService` |
| `file <path>` | Dosyadaki sembolleri listele | `funclib file src/utils.ts` |
| `stats` | İndeks istatistikleri | `funclib stats` |
| `serve` | REST API başlat | `funclib serve` |

### Opsiyonlar

```bash
# Proje yolu belirt
funclib search handleSubmit --project /path/to/project

# Sembol tipine göre filtrele
funclib search User --kind class
funclib search handle --kind function

# Sonuç limiti
funclib search api --limit 10

# JSON çıktı
funclib refs fetchData --json
```

### Örnek Kullanımlar

```bash
# 1. Proje indeksle
funclib index
# ✓ Indexed in 1234ms
#   Files: 156
#   Symbols: 2340
#   References: 8920

# 2. Fonksiyon ara
funclib search handleSubmit
# Search: "handleSubmit" (3 results)
#   handleSubmit (function)
#     src/components/Form.tsx:45
#   handleSubmitForm (method)
#     src/services/formService.ts:23

# 3. Referansları bul (⚠️ DEĞİŞİKLİK ÖNCE ZORUNLU!)
funclib refs useEditorStore
# References for: useEditorStore
# Definitions (1):
#   src/stores/editorStore.ts:15
# References (12):
#   src/components/Editor.vue:34
#   src/pages/editor/index.vue:67
#   ...
```

---

## 🌐 REST API

### Sunucuyu Başlat

```bash
# Varsayılan port: 3456
funclib serve

# Veya özel port/proje
FUNCLIB_PROJECT=/path/to/project PORT=3456 npm run serve
```

### Endpoint'ler

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| `GET` | `/` | API bilgisi |
| `GET` | `/health` | Sağlık kontrolü |
| `POST` | `/index` | Projeyi indeksle |
| `POST` | `/index/file` | Tek dosya indeksle |
| `GET` | `/search?q=...` | Sembol ara |
| `GET` | `/refs/:name` | Referansları bul |
| `GET` | `/symbol/:name` | Sembol detayı |
| `GET` | `/file/:path` | Dosyadaki semboller |
| `GET` | `/stats` | İstatistikler |
| `GET` | `/graph` | Call graph |

### Örnek İstekler

```bash
# Projeyi indeksle
curl -X POST http://localhost:3456/index

# Sembol ara
curl "http://localhost:3456/search?q=handleSubmit&kind=function&limit=10"

# Referansları bul (⚠️ EN ÖNEMLİ!)
curl "http://localhost:3456/refs/useEditorStore"

# Sembol detayı
curl "http://localhost:3456/symbol/IndexManager"

# Dosyadaki semboller
curl "http://localhost:3456/file/src%2Fserver.ts"

# İstatistikler
curl "http://localhost:3456/stats"
```

### Yanıt Formatları

```json
// GET /search?q=handleSubmit
{
  "query": "handleSubmit",
  "count": 3,
  "results": [
    {
      "symbol": {
        "name": "handleSubmit",
        "kind": "function",
        "file": "src/components/Form.tsx",
        "range": { "start": { "line": 45, "column": 0 }, "end": { "line": 52, "column": 1 } }
      },
      "score": 100
    }
  ]
}

// GET /refs/useEditorStore
{
  "name": "useEditorStore",
  "definitions": [
    { "file": "src/stores/editorStore.ts", "line": 15, "kind": "function" }
  ],
  "references": [
    { "file": "src/components/Editor.vue", "line": 34 },
    { "file": "src/pages/editor/index.vue", "line": 67 }
  ],
  "definitionCount": 1,
  "referenceCount": 12
}
```

---

## 🤖 MCP Server

### MCP Nedir?

Model Context Protocol - AI asistanlarının (Claude, Copilot) external tool'ları kullanmasını sağlayan protokol.

### Sunucuyu Başlat

```bash
# Varsayılan port: 3457
npm run mcp

# Veya
MCP_PORT=3457 FUNCLIB_PROJECT=/path/to/project node dist/mcp.js
```

### Mevcut Tool'lar

| Tool | Açıklama |
|------|----------|
| `search_symbols` | Sembol ara |
| `find_references` | Referansları bul (⚠️ KRİTİK) |
| `get_symbol` | Sembol detayı |
| `list_symbols_in_file` | Dosyadaki semboller |
| `index_project` | Projeyi indeksle |
| `get_stats` | İstatistikler |

### Claude Desktop / VS Code Konfigürasyonu

```json
// claude_desktop_config.json veya settings.json
{
  "mcpServers": {
    "funclib": {
      "url": "http://localhost:3457"
    }
  }
}
```

### Tool Kullanım Örnekleri

```json
// search_symbols
{
  "name": "search_symbols",
  "arguments": {
    "query": "handleSubmit",
    "kind": "function",
    "limit": 10
  }
}

// find_references (⚠️ HER DEĞİŞİKLİKTEN ÖNCE!)
{
  "name": "find_references",
  "arguments": {
    "name": "useEditorStore"
  }
}

// get_symbol
{
  "name": "get_symbol",
  "arguments": {
    "name": "IndexManager"
  }
}

// list_symbols_in_file
{
  "name": "list_symbols_in_file",
  "arguments": {
    "file": "src/server.ts"
  }
}

// index_project
{
  "name": "index_project",
  "arguments": {
    "incremental": true
  }
}
```

---

## 📝 Copilot Instructions

Projenize `.github/copilot-instructions.md` ekleyin:

```markdown
# Copilot Instructions - FuncLib

## ⚠️ KRİTİK KURAL

**Bir fonksiyonu/method'u değiştirmeden ÖNCE mutlaka `find_references` kullan!**

## MCP Tool Kullanımı

### 1. search_symbols
Sembolleri ara (fonksiyon, class, method, vb.)

### 2. find_references ⚠️ EN ÖNEMLİ
Bir sembolün TÜM kullanım yerlerini bul

### 3. get_symbol
Sembol detaylarını getir

### 4. list_symbols_in_file
Dosyadaki tüm sembolleri listele

### 5. index_project
Projeyi yeniden indeksle

## Düzeltme Workflow'u

### DOĞRU ✅
1. `find_references` ile tüm kullanımları bul
2. Kaç yerde kullanıldığını not et
3. Fonksiyon tanımını değiştir
4. TÜM kullanım yerlerini güncelle
5. Tekrar `find_references` ile kontrol et

### YANLIŞ ❌
1. Sadece fonksiyon tanımını değiştir
2. Çağrı yerlerini unutmak
3. Build hatası!
```

---

## 🌍 Desteklenen Diller

| Dil | Uzantılar | Symbol Türleri |
|-----|-----------|----------------|
| **JavaScript** | `.js`, `.mjs`, `.cjs` | function, class, variable, const |
| **TypeScript** | `.ts`, `.tsx` | function, class, interface, type, enum |
| **Python** | `.py` | function, class, method, variable |
| **Vue** | `.vue` | component, composable, emit |
| **Go** | `.go` | func, struct, interface |
| **Rust** | `.rs` | fn, struct, impl, trait |
| **Java** | `.java` | class, interface, method |
| **Kotlin** | `.kt` | class, fun, object |
| **C#** | `.cs` | class, interface, method |
| **C/C++** | `.c`, `.cpp`, `.h` | function, struct, class |
| **PHP** | `.php` | function, class, method |
| **Ruby** | `.rb` | def, class, module |
| **Swift** | `.swift` | func, class, struct |
| **Dart** | `.dart` | class, function, mixin |

---

## ⚙️ Konfigürasyon

### Index Konumu

```
your-project/
├── .funclib/
│   └── index.json    # Otomatik oluşturulur
├── src/
└── ...
```

### Exclude Patterns

Varsayılan olarak şunlar hariç tutulur:
- `node_modules`
- `dist`, `build`, `out`
- `.git`
- `coverage`
- `vendor`
- `__pycache__`
- `.next`, `.nuxt`

### Environment Variables

| Variable | Default | Açıklama |
|----------|---------|----------|
| `FUNCLIB_PROJECT` | `cwd` | Proje yolu |
| `PORT` | `3456` | REST API portu |
| `MCP_PORT` | `3457` | MCP Server portu |

---

## 🔧 Troubleshooting

### Index Yenileme

```bash
# Incremental (sadece değişenler)
funclib index

# Full rebuild (tümünü)
rm -rf .funclib && funclib index
```

### Tree-sitter Hataları

```bash
# Parser'ı yeniden kur
npm rebuild web-tree-sitter
npm rebuild tree-sitter-wasms
```

### Port Çakışması

```bash
# Farklı port kullan
PORT=3460 funclib serve
MCP_PORT=3461 npm run mcp
```

---

## 📊 Performans

| Metrik | Değer |
|--------|-------|
| İndeksleme Hızı | ~1000 dosya/saniye |
| Arama Hızı | < 10ms |
| Referans Bulma | < 50ms |
| Bellek Kullanımı | ~100MB / 10K sembol |

---

## 🔗 Linkler

- **GitHub**: https://github.com/Growth-Sheriff/funclip
- **REST API**: http://localhost:3456
- **MCP Server**: http://localhost:3457

---

## 📜 Changelog

### v4.0.0
- Tree-sitter tabanlı yeni parser
- MCP Server desteği
- Call graph analizi
- 30+ dil desteği
- Incremental indexing
- Fuzzy search

---

> **Önemli Hatırlatma**: Herhangi bir fonksiyon/method/class değişikliği yapmadan önce **mutlaka** `find_references` kullanın!
