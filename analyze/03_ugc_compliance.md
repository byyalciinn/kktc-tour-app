# App Store Reject: Guideline 1.2 - User-Generated Content (UGC)

## Reject Sebebi

> **Issue Description**: We found in our review that your app includes user-generated content but does not have all the required precautions. Apps with user-generated content must take specific steps to moderate content and prevent abusive behavior.
>
> **Next Steps**: To resolve this issue, please revise your app to implement the following precautions:
> - Require that users agree to terms (EULA) and these terms must make it clear that there is no tolerance for objectionable content or abusive users
> - A mechanism for users to block abusive users. Blocking should also notify the developer of the inappropriate content and should remove it from the user's feed instantly.
> - The developer must act on objectionable content reports within 24 hours by removing the content and ejecting the user who provided the offending content

---

## Mevcut Durum Analizi

### UGC Özellikleri (Projede Var)

| Özellik | Dosya | Durum |
|---------|-------|-------|
| Community Posts | `app/(tabs)/community.tsx` | ✅ Aktif |
| Post Yorumları | `components/sheets/PostDetailSheet.tsx` | ✅ Aktif |
| Fotoğraf Paylaşımı | `components/sheets/CreatePostSheet.tsx` | ✅ Aktif |

### Mevcut Moderasyon Altyapısı

#### 1. Report Sistemi ✅ (Kısmen Var)

**Database Migration:** `supabase/migrations/013_community_reports_and_account_deletion.sql`
```sql
CREATE TABLE IF NOT EXISTS community_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL CHECK (reason IN ('spam', 'inappropriate', 'harassment', 'misinformation', 'other')),
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- Prevent duplicate reports
  UNIQUE(post_id, reporter_id)
);
```

**UI Implementation:** `app/(tabs)/community.tsx`
```typescript
const handleReportPost = useCallback((post: CommunityPost) => {
  const { reportPost } = useCommunityStore.getState();
  // Report reasons dialog...
  await reportPost(post.id, reason.id as any);
});
```

#### 2. Hide Post (Not Interested) ✅ (Var)

**Database:** `hidden_posts` tablosu
**UI:** Post action sheet'te "Not Interested" seçeneği

#### 3. Auto-Moderation ✅ (Var)

**Trigger:** 5+ report alan postlar otomatik "pending" durumuna alınıyor
```sql
-- Auto-hide post after 5 reports
IF report_count >= 5 THEN
  UPDATE community_posts SET status = 'pending' WHERE id = NEW.post_id;
END IF;
```

#### 4. Admin Moderation Panel ✅ (Kısmen Var)

**Route:** `app/admin/moderation.tsx` (tanımlı ama içeriği kontrol edilmeli)

---

## Eksik Özellikler (Apple Gereksinimleri)

### ❌ 1. Terms/EULA Onayı

**Apple'ın İstediği:**
> "Require that users agree to terms (EULA) and these terms must make it clear that there is no tolerance for objectionable content or abusive users"

**Mevcut Durum:** Yok

### ❌ 2. Block User Mekanizması

**Apple'ın İstediği:**
> "A mechanism for users to block abusive users. Blocking should also notify the developer of the inappropriate content and should remove it from the user's feed instantly."

**Mevcut Durum:** Sadece post hide var, user block yok

### ⚠️ 3. 24 Saat Moderasyon Süreci

**Apple'ın İstediği:**
> "The developer must act on objectionable content reports within 24 hours by removing the content and ejecting the user who provided the offending content"

**Mevcut Durum:** Admin panel var ama süreç dokümante değil

---

## Implementation Planı

### Adım 1: Terms/EULA Onay Sistemi

#### A) Database Migration

**Dosya:** `supabase/migrations/014_terms_acceptance.sql`

```sql
-- Terms acceptance tracking
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS 
  terms_accepted_at TIMESTAMPTZ DEFAULT NULL;

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS 
  terms_version TEXT DEFAULT NULL;

-- Function to check if user accepted latest terms
CREATE OR REPLACE FUNCTION has_accepted_terms(user_id UUID, required_version TEXT DEFAULT '1.0')
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = user_id 
    AND terms_accepted_at IS NOT NULL
    AND terms_version >= required_version
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### B) Terms Acceptance Store

**Dosya:** `stores/termsStore.ts`

```typescript
import { create } from 'zustand';
import { supabase } from '@/lib/supabase';

interface TermsState {
  hasAcceptedTerms: boolean;
  isChecking: boolean;
  checkTermsAcceptance: (userId: string) => Promise<boolean>;
  acceptTerms: (userId: string) => Promise<{ success: boolean; error?: string }>;
}

export const useTermsStore = create<TermsState>((set, get) => ({
  hasAcceptedTerms: false,
  isChecking: true,
  
  checkTermsAcceptance: async (userId: string) => {
    set({ isChecking: true });
    const { data } = await supabase
      .from('profiles')
      .select('terms_accepted_at')
      .eq('id', userId)
      .single();
    
    const accepted = !!data?.terms_accepted_at;
    set({ hasAcceptedTerms: accepted, isChecking: false });
    return accepted;
  },
  
  acceptTerms: async (userId: string) => {
    const { error } = await supabase
      .from('profiles')
      .update({ 
        terms_accepted_at: new Date().toISOString(),
        terms_version: '1.0'
      })
      .eq('id', userId);
    
    if (error) return { success: false, error: error.message };
    set({ hasAcceptedTerms: true });
    return { success: true };
  },
}));
```

#### C) Terms Acceptance Sheet

**Dosya:** `components/sheets/TermsAcceptanceSheet.tsx`

```typescript
interface TermsAcceptanceSheetProps {
  visible: boolean;
  onAccept: () => void;
}

export default function TermsAcceptanceSheet({ visible, onAccept }: TermsAcceptanceSheetProps) {
  const { t } = useTranslation();
  const [agreed, setAgreed] = useState(false);
  
  return (
    <Modal visible={visible} animationType="slide">
      <View style={styles.container}>
        <Text style={styles.title}>{t('terms.title')}</Text>
        
        <ScrollView style={styles.content}>
          <Text style={styles.sectionTitle}>{t('terms.communityGuidelines')}</Text>
          <Text style={styles.text}>
            {t('terms.guidelinesContent')}
          </Text>
          
          <Text style={styles.sectionTitle}>{t('terms.prohibitedContent')}</Text>
          <Text style={styles.text}>
            • {t('terms.noHateSpeech')}
            • {t('terms.noHarassment')}
            • {t('terms.noExplicitContent')}
            • {t('terms.noSpam')}
            • {t('terms.noMisinformation')}
          </Text>
          
          <Text style={styles.warning}>
            {t('terms.violationWarning')}
          </Text>
        </ScrollView>
        
        <View style={styles.checkboxRow}>
          <Checkbox value={agreed} onValueChange={setAgreed} />
          <Text style={styles.checkboxLabel}>
            {t('terms.agreeCheckbox')}
          </Text>
        </View>
        
        <TouchableOpacity 
          style={[styles.button, !agreed && styles.buttonDisabled]}
          disabled={!agreed}
          onPress={onAccept}
        >
          <Text style={styles.buttonText}>{t('terms.acceptButton')}</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}
```

#### D) Community Tab'da Terms Kontrolü

**Dosya:** `app/(tabs)/community.tsx` - Değişiklik

```typescript
// CreatePostSheet açılmadan önce terms kontrolü
const handleCreatePress = useCallback(async () => {
  if (!user) {
    // Login prompt...
    return;
  }
  
  // Terms kontrolü
  const { hasAcceptedTerms, checkTermsAcceptance } = useTermsStore.getState();
  if (!hasAcceptedTerms) {
    const accepted = await checkTermsAcceptance(user.id);
    if (!accepted) {
      setShowTermsSheet(true);
      return;
    }
  }
  
  setIsFabMenuOpen(false);
  setIsCreateSheetVisible(true);
}, [user]);
```

---

### Adım 2: Block User Sistemi

#### A) Database Migration

**Dosya:** `supabase/migrations/015_block_users.sql`

```sql
-- Blocked users table
CREATE TABLE IF NOT EXISTS blocked_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prevent duplicate blocks
  UNIQUE(blocker_id, blocked_id),
  
  -- Can't block yourself
  CHECK (blocker_id != blocked_id)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_blocked_users_blocker ON blocked_users(blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocked_users_blocked ON blocked_users(blocked_id);

-- RLS Policies
ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;

-- Users can manage their own blocks
CREATE POLICY "Users can manage own blocks"
  ON blocked_users
  FOR ALL
  TO authenticated
  USING (blocker_id = auth.uid())
  WITH CHECK (blocker_id = auth.uid());

-- Function to check if user is blocked
CREATE OR REPLACE FUNCTION is_user_blocked(checker_id UUID, target_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM blocked_users 
    WHERE blocker_id = checker_id AND blocked_id = target_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Auto-create report when blocking
CREATE OR REPLACE FUNCTION auto_report_on_block()
RETURNS TRIGGER AS $$
BEGIN
  -- Find the most recent post from blocked user and create a report
  INSERT INTO community_reports (post_id, reporter_id, reason, description)
  SELECT id, NEW.blocker_id, 'harassment', 'User blocked - auto-generated report'
  FROM community_posts
  WHERE user_id = NEW.blocked_id
  ORDER BY created_at DESC
  LIMIT 1
  ON CONFLICT (post_id, reporter_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER auto_report_on_block_trigger
  AFTER INSERT ON blocked_users
  FOR EACH ROW
  EXECUTE FUNCTION auto_report_on_block();
```

#### B) Block Store

**Dosya:** `stores/blockStore.ts`

```typescript
import { create } from 'zustand';
import { supabase } from '@/lib/supabase';

interface BlockState {
  blockedUserIds: string[];
  isLoading: boolean;
  
  fetchBlockedUsers: (userId: string) => Promise<void>;
  blockUser: (blockerId: string, blockedId: string, reason?: string) => Promise<{ success: boolean; error?: string }>;
  unblockUser: (blockerId: string, blockedId: string) => Promise<{ success: boolean; error?: string }>;
  isBlocked: (userId: string) => boolean;
}

export const useBlockStore = create<BlockState>((set, get) => ({
  blockedUserIds: [],
  isLoading: false,
  
  fetchBlockedUsers: async (userId: string) => {
    set({ isLoading: true });
    const { data } = await supabase
      .from('blocked_users')
      .select('blocked_id')
      .eq('blocker_id', userId);
    
    set({ 
      blockedUserIds: data?.map(b => b.blocked_id) || [],
      isLoading: false 
    });
  },
  
  blockUser: async (blockerId: string, blockedId: string, reason?: string) => {
    const { error } = await supabase
      .from('blocked_users')
      .insert({ blocker_id: blockerId, blocked_id: blockedId, reason });
    
    if (error) return { success: false, error: error.message };
    
    // Update local state immediately
    set(state => ({ 
      blockedUserIds: [...state.blockedUserIds, blockedId] 
    }));
    
    return { success: true };
  },
  
  unblockUser: async (blockerId: string, blockedId: string) => {
    const { error } = await supabase
      .from('blocked_users')
      .delete()
      .eq('blocker_id', blockerId)
      .eq('blocked_id', blockedId);
    
    if (error) return { success: false, error: error.message };
    
    set(state => ({ 
      blockedUserIds: state.blockedUserIds.filter(id => id !== blockedId) 
    }));
    
    return { success: true };
  },
  
  isBlocked: (userId: string) => {
    return get().blockedUserIds.includes(userId);
  },
}));
```

#### C) Community Feed Filtreleme

**Dosya:** `stores/communityStore.ts` - Değişiklik

```typescript
// fetchPosts içinde blocked users filtreleme
fetchPosts: async (refresh = false) => {
  // ... mevcut kod
  
  const { data, error } = await query;
  if (error) throw error;
  
  // Filter out blocked users' posts
  const { blockedUserIds } = useBlockStore.getState();
  const filteredData = data.filter(post => !blockedUserIds.includes(post.user_id));
  
  const enrichedData = await enrichPostsWithRelations(filteredData);
  // ...
};
```

#### D) Block User UI

**Dosya:** `components/cards/CommunityPostCard.tsx` - Değişiklik

Post action sheet'e "Block User" seçeneği ekle:

```typescript
const handleMenuPress = () => {
  const options = isOwnPost
    ? [t('common.cancel'), t('common.delete')]
    : [
        t('common.cancel'), 
        t('community.report'), 
        t('community.blockUser'),  // ← YENİ
        t('community.notInterested')
      ];
  
  // ...
  
  if (buttonIndex === 2 && !isOwnPost) {
    // Block user
    Alert.alert(
      t('community.blockUserTitle'),
      t('community.blockUserMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('community.block'),
          style: 'destructive',
          onPress: () => onBlockUser?.(post.userId),
        },
      ]
    );
  }
};
```

---

### Adım 3: Admin Moderation Panel İyileştirmesi

#### A) Moderation Dashboard

**Dosya:** `app/admin/moderation.tsx`

```typescript
export default function ModerationScreen() {
  const [reports, setReports] = useState<Report[]>([]);
  const [filter, setFilter] = useState<'pending' | 'all'>('pending');
  
  // Fetch pending reports
  useEffect(() => {
    fetchReports();
  }, [filter]);
  
  const fetchReports = async () => {
    let query = supabase
      .from('community_reports')
      .select(`
        *,
        post:community_posts(*),
        reporter:profiles!reporter_id(full_name, avatar_url)
      `)
      .order('created_at', { ascending: false });
    
    if (filter === 'pending') {
      query = query.eq('status', 'pending');
    }
    
    const { data } = await query;
    setReports(data || []);
  };
  
  const handleResolve = async (reportId: string, action: 'remove_content' | 'ban_user' | 'dismiss') => {
    // Remove content
    if (action === 'remove_content') {
      await supabase
        .from('community_posts')
        .update({ status: 'rejected' })
        .eq('id', report.post_id);
    }
    
    // Ban user
    if (action === 'ban_user') {
      await supabase
        .from('profiles')
        .update({ is_banned: true, banned_at: new Date().toISOString() })
        .eq('id', report.post.user_id);
    }
    
    // Update report status
    await supabase
      .from('community_reports')
      .update({ 
        status: 'resolved',
        reviewed_by: currentUser.id,
        reviewed_at: new Date().toISOString()
      })
      .eq('id', reportId);
    
    fetchReports();
  };
  
  return (
    <View>
      <Text style={styles.title}>Content Moderation</Text>
      <Text style={styles.subtitle}>
        {reports.filter(r => r.status === 'pending').length} pending reports
      </Text>
      
      <FlatList
        data={reports}
        renderItem={({ item }) => (
          <ReportCard 
            report={item}
            onRemoveContent={() => handleResolve(item.id, 'remove_content')}
            onBanUser={() => handleResolve(item.id, 'ban_user')}
            onDismiss={() => handleResolve(item.id, 'dismiss')}
          />
        )}
      />
    </View>
  );
}
```

#### B) User Ban Sistemi

**Database Migration eklemesi:**

```sql
-- Add ban fields to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS banned_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ban_reason TEXT;

-- Banned users can't create posts
CREATE POLICY "Banned users cannot create posts"
  ON community_posts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    NOT EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND is_banned = TRUE
    )
  );
```

---

### Adım 4: i18n Çevirileri

#### `locales/en.json`

```json
{
  "terms": {
    "title": "Community Guidelines",
    "communityGuidelines": "Our Community Standards",
    "guidelinesContent": "Cyprigo is a community for travelers to share their experiences. To keep our community safe and welcoming, please follow these guidelines.",
    "prohibitedContent": "Prohibited Content",
    "noHateSpeech": "Hate speech or discrimination",
    "noHarassment": "Harassment or bullying",
    "noExplicitContent": "Explicit or inappropriate content",
    "noSpam": "Spam or misleading information",
    "noMisinformation": "False or misleading content",
    "violationWarning": "Violations may result in content removal and account suspension. We review all reports within 24 hours.",
    "agreeCheckbox": "I agree to the Community Guidelines and understand that violations may result in account suspension",
    "acceptButton": "Accept & Continue"
  },
  "community": {
    "blockUser": "Block User",
    "blockUserTitle": "Block This User?",
    "blockUserMessage": "You won't see their posts anymore. They won't be notified that you blocked them.",
    "block": "Block",
    "userBlocked": "User blocked",
    "userBlockedMessage": "You won't see content from this user anymore."
  }
}
```

#### `locales/tr.json`

```json
{
  "terms": {
    "title": "Topluluk Kuralları",
    "communityGuidelines": "Topluluk Standartlarımız",
    "guidelinesContent": "Cyprigo, gezginlerin deneyimlerini paylaştığı bir topluluktur. Topluluğumuzu güvenli ve samimi tutmak için lütfen bu kurallara uyun.",
    "prohibitedContent": "Yasak İçerikler",
    "noHateSpeech": "Nefret söylemi veya ayrımcılık",
    "noHarassment": "Taciz veya zorbalık",
    "noExplicitContent": "Müstehcen veya uygunsuz içerik",
    "noSpam": "Spam veya yanıltıcı bilgi",
    "noMisinformation": "Yanlış veya yanıltıcı içerik",
    "violationWarning": "İhlaller içerik kaldırılmasına ve hesap askıya alınmasına neden olabilir. Tüm raporları 24 saat içinde inceliyoruz.",
    "agreeCheckbox": "Topluluk Kurallarını kabul ediyorum ve ihlallerin hesap askıya alınmasına neden olabileceğini anlıyorum",
    "acceptButton": "Kabul Et ve Devam Et"
  },
  "community": {
    "blockUser": "Kullanıcıyı Engelle",
    "blockUserTitle": "Bu Kullanıcıyı Engelle?",
    "blockUserMessage": "Artık paylaşımlarını görmeyeceksiniz. Engellediğiniz bildirilmeyecek.",
    "block": "Engelle",
    "userBlocked": "Kullanıcı engellendi",
    "userBlockedMessage": "Bu kullanıcının içeriklerini artık görmeyeceksiniz."
  }
}
```

---

## Dosya Değişiklikleri Özeti

| Dosya | Tip | Açıklama |
|-------|-----|----------|
| `supabase/migrations/014_terms_acceptance.sql` | Yeni | Terms kabul tablosu |
| `supabase/migrations/015_block_users.sql` | Yeni | Block users tablosu |
| `stores/termsStore.ts` | Yeni | Terms state yönetimi |
| `stores/blockStore.ts` | Yeni | Block state yönetimi |
| `stores/index.ts` | Modify | Export yeni store'lar |
| `components/sheets/TermsAcceptanceSheet.tsx` | Yeni | Terms onay UI |
| `app/(tabs)/community.tsx` | Modify | Terms + block entegrasyonu |
| `components/cards/CommunityPostCard.tsx` | Modify | Block user seçeneği |
| `stores/communityStore.ts` | Modify | Blocked users filtreleme |
| `app/admin/moderation.tsx` | Modify/Yeni | Moderation dashboard |
| `locales/en.json` | Modify | Çeviriler |
| `locales/tr.json` | Modify | Çeviriler |

---

## Apple'a Sunulacak Bilgiler

App Store Connect'te "Notes for Review" bölümüne:

```
UGC Compliance:

1. TERMS ACCEPTANCE: Users must accept Community Guidelines before posting content. Guidelines clearly state zero tolerance for objectionable content.

2. BLOCK USERS: Users can block abusive users from post menu. Blocking:
   - Instantly removes blocked user's content from feed
   - Auto-generates a report for developer review
   - Notifies moderation team

3. MODERATION PROCESS: 
   - All reports reviewed within 24 hours
   - Admin panel at /admin/moderation
   - Actions: Remove content, Ban user, Dismiss
   - Auto-moderation: Posts with 5+ reports auto-hidden

4. CONTACT: For urgent content issues: [support email]
```

---

## Checklist

- [ ] Migration: `014_terms_acceptance.sql`
- [ ] Migration: `015_block_users.sql`
- [ ] Store: `termsStore.ts`
- [ ] Store: `blockStore.ts`
- [ ] Component: `TermsAcceptanceSheet.tsx`
- [ ] Modify: `community.tsx` - Terms kontrolü
- [ ] Modify: `CommunityPostCard.tsx` - Block seçeneği
- [ ] Modify: `communityStore.ts` - Feed filtreleme
- [ ] Modify/Create: `app/admin/moderation.tsx`
- [ ] i18n: Çeviriler
- [ ] Test: Terms acceptance flow
- [ ] Test: Block user flow
- [ ] Test: Admin moderation
- [ ] Supabase'de migration'ları çalıştır

---

## Tahmini Süre

- Database migrations: **30 dakika**
- Stores (terms + block): **45 dakika**
- Terms UI: **1 saat**
- Block UI + entegrasyon: **1 saat**
- Admin moderation: **1.5 saat**
- i18n: **30 dakika**
- Test: **1 saat**
- **Toplam: ~6-7 saat**

---

## Risk Değerlendirmesi

| Risk | Seviye | Açıklama | Mitigasyon |
|------|--------|----------|------------|
| Migration hataları | Orta | Yeni tablolar/kolonlar | Staging'de test |
| UX karmaşıklığı | Orta | Terms popup rahatsız edici olabilir | Sadece ilk post'ta göster |
| Block abuse | Düşük | Kullanıcılar herkesi engelleyebilir | Normal davranış |
| Moderation yükü | Orta | 24 saat SLA | Push notification to admin |
