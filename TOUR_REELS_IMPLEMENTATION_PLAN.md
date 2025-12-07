# Instagram Reels-Style Tour Viewer

Kullanıcının turları Instagram Reels benzeri tam ekran deneyimi ile görüntüleyebileceği bir ekran. Her turda tek fotoğraf gösterilecek, ekranın sağına dokunulduğunda sonraki tura geçilecek. Bu ekrana ana sayfa kategori satırının başındaki **"Keşfet"** butonundan erişilecek.

---

## Proposed Changes

### UI Components

#### [NEW] `app/tour-reels.tsx`
Tam ekran Reels deneyimi:
- Turlar arası horizontal gesture navigation
- Ekranın **sağ yarısına** dokunma → sonraki tur
- Ekranın **sol yarısına** dokunma → önceki tur  
- Kategori filtrelemesi için route params desteği
- Progress bar (tur sayısı kadar segment)

#### [NEW] `components/cards/TourReelCard.tsx`
Tek tur kartı:
- Tam ekran tek fotoğraf (`Tour.image`)
- Gradient overlay ile tur bilgileri (başlık, konum, fiyat)
- Favorilere ekle butonu
- Detay sayfasına git butonu

#### [NEW] `components/ui/ReelsProgressBar.tsx`
Instagram Stories benzeri progress bar:
- Segment sayısı = toplam tur sayısı
- Aktif segment vurgulanmış

---

### Navigation & Home Page

#### [MODIFY] `app/(tabs)/index.tsx`
Kategori satırının **başına** "Keşfet" butonu ekleme:
```diff
  <ScrollView horizontal contentContainerStyle={styles.categoryIconsContainer}>
+   {/* Keşfet Butonu - Kategori satırının başında */}
+   <TouchableOpacity style={styles.exploreButton} onPress={() => router.push('/tour-reels')}>
+     <Ionicons name="compass" size={24} color="#fff" />
+     <Text>Keşfet</Text>
+   </TouchableOpacity>
    {categories.map((category, index) => ( ... ))}
  </ScrollView>
```

#### [MODIFY] `app/_layout.tsx`
Stack navigator'a route ekleme:
```diff
+ <Stack.Screen name="tour-reels" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
```

---

## Component Architecture

```
Home Screen ──"Keşfet"──> TourReelsScreen
                              │
                              ├── TourReelCard
                              │     ├── Full Screen Image
                              │     ├── Tour Info Overlay
                              │     └── Action Buttons
                              │
                              └── ReelsProgressBar
```

---

## User Flow

1. Kullanıcı kategori başındaki **"Keşfet"** butonuna tıklar
2. Tüm turlarla tam ekran Reels açılır
3. İlk tur gösterilir
4. **Ekranın sağına** dokunursa → sonraki tura geçer
5. **Ekranın soluna** dokunursa → önceki tura döner
6. **Detay butonuna** tıklarsa → TourDetailSheet açılır

---

## Verification Plan

### Manual Verification

1. **Navigasyon**: Ana sayfa → Keşfet butonu → Reels ekranı açılır
2. **Sağ Dokunuş**: Sağ tarafa dokun → sonraki tur gösterilir
3. **Sol Dokunuş**: Sol tarafa dokun → önceki tur gösterilir
4. **Progress Bar**: Aktif tur segmenti vurgulanmış
5. **Detay**: Detay butonuna tıkla → TourDetailSheet açılır

```bash
npx expo start --ios
```
