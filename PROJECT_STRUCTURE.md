# CloudyPrints Shopify Projesi - Yapı Analizi

## 📋 Proje Özeti

Bu projeden çıkacak **1 Tema** ve **2 Shopify App (Eklenti)**:

---

## 🎨 1. TEMA: CloudyPrints Theme
**Konum:** `theme/` klasörü

### Tema Özellikleri:
- ✅ 3D T-Shirt Hero (Three.js ile)
- ✅ 3D Product Carousel (4D efektler)
- ✅ Product Showcase Section
- ✅ Responsive Header/Footer
- ✅ Product Page with 3D Viewer
- ✅ Collection/Cart/Search Templates
- ✅ Theme Editor ile özelleştirme

### Tema Dosyaları:
```
theme/
├── assets/          # CSS, JS, GLB modeller
├── config/          # settings_schema.json, settings_data.json
├── layout/          # theme.liquid
├── locales/         # en.default.json
├── sections/        # Tüm section dosyaları
├── snippets/        # Parçacıklar (spin-wheel dahil DEĞİL - bu app olacak)
└── templates/       # Sayfa şablonları
```

---

## 🎡 2. APP 1: Spin & Win Discount Wheel
**Çıkarılacak:** `theme/snippets/spin-wheel.liquid`

### Özellikler:
- Çarkıfelek indirim oyunu
- Collection sayfalarında otomatik gösterim
- Session storage ile indirim takibi
- Özelleştirilebilir segment değerleri
- Gold foil premium tasarım

### App Yapısı (Oluşturulacak):
```
apps/spin-wheel-app/
├── web/
│   ├── index.js              # Express server
│   ├── shopify.js            # Shopify API bağlantısı
│   └── frontend/
│       ├── App.jsx           # React admin paneli
│       └── components/
├── extensions/
│   └── spin-wheel-block/
│       ├── blocks/
│       │   └── spin-wheel.liquid
│       └── shopify.extension.toml
├── package.json
└── shopify.app.toml
```

---

## 🖼️ 3. APP 2: 3D Product Customizer
**Çıkarılacak:** `hero-3d.js`, `product-3d.js`, `product-3d-gallery.liquid`

### Özellikler:
- Three.js ile 3D ürün görüntüleme
- Kullanıcı logo yükleme (Decal)
- Renk değiştirme
- GLB model desteği
- Product page entegrasyonu

### App Yapısı (Oluşturulacak):
```
apps/3d-customizer-app/
├── web/
│   ├── index.js
│   ├── shopify.js
│   └── frontend/
│       ├── App.jsx
│       └── components/
│           ├── ThreeViewer.jsx
│           └── ColorPicker.jsx
├── extensions/
│   └── 3d-customizer-block/
│       ├── assets/
│       │   ├── 3d-viewer.js
│       │   └── 3d-viewer.css
│       ├── blocks/
│       │   └── 3d-viewer.liquid
│       └── shopify.extension.toml
├── package.json
└── shopify.app.toml
```

---

## 🖥️ Sunucu Yapısı (Tek Sunucu, 2 App)

```
/var/www/
├── spin-wheel-app/          # Port 3000
│   └── ...
├── 3d-customizer-app/       # Port 3001
│   └── ...
└── nginx/
    └── sites-available/
        ├── spinwheel.yourdomain.com
        └── customizer.yourdomain.com
```

### Nginx Config Örneği:
```nginx
# Spin Wheel App
server {
    listen 443 ssl;
    server_name spinwheel.yourdomain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
    }
}

# 3D Customizer App
server {
    listen 443 ssl;
    server_name customizer.yourdomain.com;
    
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
    }
}
```

---

## 📝 Gerekli Bilgiler

Devam edebilmem için şunlar lazım:

### Shopify Partner Dashboard:
- [ ] Partner hesap ID
- [ ] Organization ID

### App 1 (Spin Wheel) için:
- [ ] App API Key
- [ ] App Secret Key
- [ ] App URL (spinwheel.domain.com)

### App 2 (3D Customizer) için:
- [ ] App API Key  
- [ ] App Secret Key
- [ ] App URL (customizer.domain.com)

### Sunucu Bilgileri:
- [ ] SSH host/IP
- [ ] SSH port
- [ ] Username
- [ ] Domain names

### Git Repos:
- [ ] Tema repo URL
- [ ] Spin Wheel App repo URL
- [ ] 3D Customizer App repo URL

---

## 🚀 Sonraki Adımlar

1. **Tema temizleme:** Eklenti kodlarını temadan ayırma
2. **App 1 oluşturma:** Spin Wheel Shopify App
3. **App 2 oluşturma:** 3D Customizer Shopify App
4. **Deploy scripts:** Sunucu deploy scriptleri

---

*Oluşturulma: 2025-12-19*

