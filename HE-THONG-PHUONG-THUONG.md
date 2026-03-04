# Hệ Thống Phần Thưởng Khuyến Khích Hoàn Thành Thói Quen

## Bối Cảnh (Context)

Hiện tại We-Grow đã có hệ thống gamification cơ bản:
- **Phần thưởng XP**: 10 điểm cho mỗi thói quen hoàn thành
- **Thưởng chuỗi ngày**: 50/200/500 XP cho chuỗi 7/30/100 ngày
- **Hệ thống cấp độ**: 10 cấp độ từ Seed (Hạt giống) → Mythical (Thần thoại)
- **Huy hiệu cấp độ**: Tự động cấp khi lên level

Tuy nhiên, hệ thống còn thiếu các yếu tố phần thưởng đa dạng để giữ động lực người dùng lâu dài. Cần thêm:
- **Huy hiệu thành tựu (Achievement Badges)**: Huy hiệu cho các cột mốc cụ thể (thói quen đầu tiên, tuần hoàn hảo, làm sớm, etc.)
- **Thách thức thời gian**: Daily/Weekly/Monthly challenges
- **Cửa hàng phần thưởng**: Đổi XP lấy items (giao diện, danh hiệu, vật phẩm tiêu hao)
- **Sự kiện theo mùa**: Thử thách hàng tháng với huy hiệu đặc biệt

## Kế Hoạch Triển Khai (Implementation Plan)

### Giai Đoạn 1: Database Models (Tuần 1)

**Các Model Mới Cần Tạo:**

1. **`packages/db/src/models/achievement.model.ts`**
   - Định nghĩa thành tựu với các trường: `achievementKey`, `category`, `tier`, `requirements`
   - Categories (danh mục): milestone (cột mốc), streak (chuỗi), timing (thời gian), consistency (đều đặn), social (xã hội), seasonal (theo mùa)
   - Tiers (hạng): bronze (đồng), silver (bạc), gold (vàng), diamond (kim cương), legendary (huyền thoại)
   - Theo pattern của `user-badge.model.ts` với string UUID `_id`

2. **`packages/db/src/models/user-achievement.model.ts`**
   - Theo dõi tiến độ của user trên từng thành tựu
   - Các trường: `userId`, `achievementKey`, `progress` (tiến độ hiện tại), `maxProgress` (mục tiêu), `completedAt` (thời gian hoàn thành)
   - Unique index trên `{ userId: 1, achievementKey: 1 }` để tránh trùng lặp

3. **`packages/db/src/models/challenge.model.ts`**
   - Định nghĩa thử thách hàng ngày/tuần/tháng
   - Các trường: `challengeKey`, `type`, `requirements`, `xpReward`, `startDate`, `endDate`
   - Recurrence pattern (mẫu lặp lại) cho các thử thách định kỳ

4. **`packages/db/src/models/user-challenge.model.ts`**
   - Theo dõi tiến độ của user trên các thử thách
   - Các trường: `userId`, `challengeKey`, `instanceId` (để phân biệt các lần lặp), `progress`, `claimedAt` (đã nhận thưởng chưa)

5. **`packages/db/src/models/shop-item.model.ts`**
   - Định nghĩa vật phẩm trong cửa hàng (giao diện, danh hiệu, vật phẩm tiêu hao, mở khóa)
   - Các trường: `itemKey`, `category`, `xpCost` (giá XP), `maxPurchases` (số lần mua tối đa), `effects` (hiệu quả)

6. **`packages/db/src/models/user-purchase.model.ts`**
   - Theo dõi các lần mua của user
   - Unique index trên `{ userId: 1, itemKey: 1 }` để enforce giới hạn mua (`maxPurchases`)

7. **`packages/db/src/models/user-inventory.model.ts`**
   - Kho đồ của user: `ownedItems` (vật phẩm đã sở hữu), `equippedItems` (đang trang bị), `consumables` (vật phẩm tiêu hao), `unlockedFeatures` (tính năng đã mở khóa)

**Chỉnh Sửa Models Hiện Có:**

8. **`packages/db/src/models/user-profile.model.ts`**
   - Thêm trường: `maxHabitSlots: { type: Number, default: 10 }` (số thói quen tối đa), `activeStreakFreeze: { type: Boolean, default: false }` (đang dùng bảo vệ chuỗi)

9. **`packages/db/src/models/xp-transaction.model.ts`**
   - Thêm nguồn (sources): `"achievement_unlocked"` (mở khóa thành tựu), `"challenge_completed"` (hoàn thành thử thách), `"shop_purchase"` (mua hàng)

10. **`packages/db/src/models/activity.model.ts`**
    - Thêm loại (types): `"achievement_earned"` (nhận thành tựu), `"challenge_completed"` (hoàn thành thử thách), `"shop_purchase"` (mua hàng)

**Cập nhật exports trong `packages/db/src/models/index.ts`**

### Giai Đoạn 2: Core Library Functions (Tuần 2)

**Các File Quan Trọng:**

1. **`packages/api/src/lib/achievements.ts`**
   - `checkAndAwardAchievement(userId, achievementKey, context)` - Kiểm tra và cấp thành tựu (atomic)
   - `updateAchievementProgress(userId, achievementKey, delta)` - Cập nhật tiến độ
   - `getAchievementDefinition(key)` - Lấy cấu hình thành tựu
   - `getUserAchievements(userId)` - Lấy danh sách thành tựu của user với tiến độ

2. **`packages/api/src/lib/achievement-definitions.ts`**
   - Export mảng `ACHIEVEMENT_DEFINITIONS` với 20+ thành tựu
   - Ví dụ:
     - `first_habit`: Hoàn thành thói quen đầu tiên (đồng, 10 XP)
     - `perfect_week`: Hoàn thành tất cả thói quen trong 7 ngày (bạc, 50 XP)
     - `early_bird`: Hoàn thành 5 thói quen trước 8 sáng (đồng, 15 XP)
     - `night_owl`: Hoàn thành 5 thói quen sau 10 tối (đồng, 15 XP)
     - `habit_master_30/100/365`: Hoàn thành cùng một thói quen 30/100/365 lần
     - `streak_keeper_7/30/100`: Duy trì chuỗi 7/30/100 ngày
     - `explorer`: Tạo thói quen đầu tiên
     - `social_butterfly`: Tham gia nhóm đầu tiên

3. **`packages/api/src/lib/challenges.ts`**
   - `getActiveChallenges(type, date)` - Lấy thử thách đang hoạt động
   - `updateChallengeProgress(userId, challengeKey, instanceId, progressData)` - Cập nhật tiến độ thử thách
   - `completeChallenge(userId, challengeKey, instanceId)` - Đánh dấu hoàn thành, cấp thưởng
   - `generateDailyChallenges()` - Cron job để tạo thử thách hàng ngày

4. **`packages/api/src/lib/shop.ts`**
   - `getShopItems(category?)` - Lấy danh sách vật phẩm có sẵn
   - `purchaseItem(userId, itemKey)` - Mua vật phẩm với trừ XP (atomic)
   - `useConsumable(userId, consumableType)` - Sử dụng vật phẩm tiêu hao (bảo vệ chuỗi, etc.)
   - `equipItem(userId, itemKey, slot)` - Trang bị giao diện/huy hiệu/danh hiệu
   - `getUserInventory(userId)` - Lấy kho đồ của user

5. **`packages/api/src/lib/shop-items.ts`**
   - Export mảng `SHOP_ITEMS` với:
     - Themes (Giao diện): Ocean Breeze, Sunset Blaze (500 XP mỗi cái)
     - Titles (Danh hiệu): Habit Hero (Người hùng thói quen), Consistency King (Vua sự kiên trì) (300-1000 XP)
     - Consumables (Vật phẩm tiêu hao): Streak Freeze (Đóng băng chuỗi - 200 XP), Extra Habit Slots (Slot thêm - 1000 XP)
     - Unlocks (Mở khóa): Custom Icons (Biểu tượng tùy chỉnh - 1500 XP), Advanced Analytics (Phân tích nâng cao - 2000 XP)

6. **`packages/api/src/lib/reward-events.ts`**
   - Điều phối viên trung tâm tích hợp với `habit-completion.ts` hiện có
   - `onHabitCompleted(userId, habitId, date, time)` - Kích hoạt kiểm tra thành tựu/thử thách
   - `onStreakMilestone(userId, habitId, streak)` - Kiểm tra thành tựu chuỗi ngày
   - `onGroupJoined(userId, groupId)` - Thành tựu xã hội

### Giai Đoạn 3: API Integration (Tuần 3)

**Router Mới:**

1. **`packages/api/src/routers/rewards.ts`**
   ```typescript
   export const rewardsRouter = {
     // Thành tựu (Achievements)
     getAchievements: protectedProcedure.handler(...), // Lấy danh sách thành tựu
     claimAchievement: protectedProcedure.input(z.object({ achievementKey: z.string() })).handler(...), // Nhận thưởng

     // Thử thách (Challenges)
     getActiveChallenges: protectedProcedure.input(z.object({ type: z.string().optional() })).handler(...), // Lấy thử thách đang hoạt động
     claimChallengeReward: protectedProcedure.input(z.object({ challengeKey: z.string(), instanceId: z.string() })).handler(...), // Nh� thưởng thử thách

     // Cửa hàng (Shop)
     getShopItems: protectedProcedure.input(z.object({ category: z.string().optional() })).handler(...), // Lấy vật phẩm
     purchaseItem: protectedProcedure.input(z.object({ itemKey: z.string() })).handler(...), // Mua vật phẩm
     equipItem: protectedProcedure.input(z.object({ itemKey: z.string(), slot: z.enum(["theme", "badge", "title"]) })).handler(...), // Trang bị

     // Kho đồ (Inventory)
     getInventory: protectedProcedure.handler(...), // Lấy kho đồ
     useConsumable: protectedProcedure.input(z.object({ type: z.enum(["streak_freeze", "extra_habit_slot"]) })).handler(...), // Dùng vật phẩm tiêu hao
   };
   ```

**Điểm Tích Hợp:**

2. **`packages/api/src/lib/habit-completion.ts`** - Chỉnh sửa `completeHabitForUser()`
   - Sau dòng 254 (sau `checkAllHabitsBonus`), thêm:
     ```typescript
     import { checkAchievementsForHabitCompletion } from "./achievements";
     import { updateChallengesForHabitCompletion } from "./challenges";

     await checkAchievementsForHabitCompletion(userId, habitIdStr, completionDate, {
       completionTime: now,
       habit,
       timezone
     });
     await updateChallengesForHabitCompletion(userId, completionDate, {
       habitId: habitIdStr,
       completionCount: 1
     });
     ```

3. **`packages/api/src/routers/groups.ts`** - Thêm vào procedure `join`
   - Sau khi tham gia nhóm thành công, kiểm tra thành tựu `social_butterfly`

4. **`packages/api/src/routers/index.ts`** - Thêm rewards router

5. **`packages/api/src/lib/push.ts`** - Thêm `sendAchievementNotification(userId, achievementKey)` (gửi thông báo khi nhận thành tựu)

### Giai Đoạn 4: Cron Jobs (Tuần 4)

**Các File Cron Mới:**

1. **`packages/api/src/cron/daily-challenges.ts`**
   - Chạy lúc nửa đêm UTC, tạo instance `daily_YYYY-MM-DD`
   - Tạo thử thách như "Hoàn thành 5 thói quen hôm nay"

2. **`packages/api/src/cron/weekly-challenges.ts`**
   - Chạy nửa đêm Chủ nhật, tạo instance `weekly_YYYY-Www`
   - Tạo thử thách như "Hoàn thành thói quen 5 ngày trong tuần"

3. **`packages/api/src/cron/monthly-challenges.ts`**
   - Chạy ngày 1 của tháng, tạo sự kiện theo mùa
   - Ví dụ: Tháng 1 "Khởi đầu mới" - thử thách chuỗi 21 ngày

### Giai Đoạn 5: Frontend Components (Tuần 5-6)

**Các Component Mới:**

1. **`apps/web/src/components/achievement-card.tsx`**
   - Hiển thị thành tựu individual với thanh tiến độ
   - Hiển thị trạng thái đã khóa/đã mở, hạng (tier), XP thưởng

2. **`apps/web/src/components/achievement-grid.tsx`**
   - Lưới tất cả thành tựu được nhóm theo danh mục
   - Sử dụng pattern của `badge-collection.tsx` hiện có

3. **`apps/web/src/components/achievement-unlock-modal.tsx`**
   - Tương tự `LevelUpModal`, hiển thị animation mở khóa thành tựu

4. **`apps/web/src/components/challenge-card.tsx`**
   - Hiển thị thử thách đang hoạt động với tiến độ và đồng hồ đếm ngược

5. **`apps/web/src/components/shop-item-card.tsx`**
   - Hiển thị vật phẩm với giá, nút mua, trạng thái đã sở hữu

6. **`apps/web/src/components/shop-grid.tsx`**
   - Lưới vật phẩm với bộ lọc danh mục

7. **`apps/web/src/components/inventory-panel.tsx`**
   - Hiển thị vật phẩm đã sở hữu, đang trang bị, vật phẩm tiêu hao

**Các Trang Mới:**

8. **`apps/web/src/app/(app)/achievements/page.tsx`**
   - Trang bộ sưu tập thành tựu

9. **`apps/web/src/app/(app)/challenges/page.tsx`**
   - Trang thử thách đang hoạt động

10. **`apps/web/src/app/(app)/shop/page.tsx`**
    - Trang cửa hàng phần thưởng

11. **`apps/web/src/app/(app)/inventory/page.tsx`**
    - Trang quản lý kho đồ

**Cập Nhật Điều Hướng:**

12. **`apps/web/src/components/navigation.tsx`**
    - Thêm mục điều hướng cho Thành tựu, Thử thách, Cửa hàng

### Giai Đoạn 6: Translations (Tuần 6)

**Cập Nhật File i18n:**

1. **`apps/web/messages/en.json`** - Thêm sections:
   - `achievements`: Tất cả tên và mô tả thành tựu
   - `challenges`: Văn bản liên quan đến thử thách
   - `shop`: Vật phẩm và văn bản UI cửa hàng
   - `inventory`: Văn bản quản lý kho đồ

2. **`apps/web/messages/vi.json`** - Bản dịch tiếng Việt

### Giai Đoạn 7: Testing (Tuần 7-8)

**Chiến Lược Kiểm Thử:**

1. **Unit Tests (Kiểm thử đơn vị)** - Kiểm tra logic thành tựu:
   - Cấp thành tựu đầu tiên đúng cách
   - Theo dõi tiến độ cho các thành tựu đa bước
   - Ngăn chặn thành tựu trùng lặp

2. **Integration Tests (Kiểm thử tích hợp)** - Kiểm tra API procedures:
   - Mua vật phẩm với XP đủ/không đủ
   - Nhận thưởng thử thách
   - Trang bị/bỏ trang bị vật phẩm

3. **E2E Tests (Kiểm thử đầu cuối)** - Kiểm test luồng user:
   - Hoàn thành thói quen → Thông báo mở khóa thành tựu
   - Kiếm XP → Mua vật phẩm từ cửa hàng
   - Hoàn thành thử thách → Nhận thưởng

4. **Performance Tests (Kiểm thử hiệu năng)**:
   - Kiểm tra thành tựu không làm chậm việc hoàn thành thói quen
   - Xác minh operations XP atomic ngăn chặn race conditions

## Các Pattern Cần Làm Theo

**Tham Khảo Các File Hiện Có:**

- **`packages/api/src/lib/habit-completion.ts:92-155`** - Sử dụng pattern `awardXp()` với MongoDB `$inc` cho atomic operations
- **`packages/api/src/lib/habit-completion.ts:157-170`** - Sử dụng pattern `checkStreakBonuses()` cho checking achievements
- **`packages/db/src/models/user-badge.model.ts:19`** - Sử dụng unique index pattern để ngăn chặn trùng lặp
- **`packages/api/src/lib/xp.ts:47-53`** - Sử dụng constant `XP_REWARDS` pattern cho số lượng thưởng
- **`apps/web/src/components/badge-collection.tsx`** - Sử dụng grid pattern cho hiển thị achievements

**Điểm Tích Hợp Quan Trọng:**

**`packages/api/src/lib/habit-completion.ts:254`** - Sau `checkAllHabitsBonus()`, chèn kiểm tra achievement và challenge. Đây là điểm kích hoạt chính cho tất cả phần thưởng.

## Các Bước Kiểm Thử (Verification Steps)

**Kiểm Thử Thủ Công:**

1. **Hoàn thành thói quen đầu tiên** → Kiểm tra thành tựu `first_habit` được cấp
2. **Hoàn thành thói quen trước 8 sáng** → Kiểm tra tiến độ `early_bird`
3. **Hoàn thành tất cả thói quen trong 7 ngày** → Kiểm tra thành tựu `perfect_week`
4. **Duy trì chuỗi 7 ngày** → Kiểm tra thành tựu `streak_keeper_7` + thưởng XP hiện có
5. **Tham gia nhóm đầu tiên** → Kiểm tra thành tựu `social_butterfly`
6. **Mua bảo vệ chuỗi (streak freeze)** → Kiểm tra XP bị trừ, vật phẩm được thêm vào kho
7. **Trang bị giao diện (theme)** → Kiểm tra giao diện được áp dụng cho profile
8. **Sử dụng bảo vệ chuỗi** → Kiểm tra chuỗi được bảo vệ khi bỏ lỡ một ngày

**Kiểm Thử API:**

```bash
# Kiểm tra lấy danh sách thành tựu
curl -X POST http://localhost:3000/api/rpc \
  -H "Content-Type: application/json" \
  -d '{"procedure":"rewards.getAchievements","input":{}}'

# Kiểm tra mua vật phẩm
curl -X POST http://localhost:3000/api/rpc \
  -H "Content-Type: application/json" \
  -d '{"procedure":"rewards.purchaseItem","input":{"itemKey":"streak_freeze"}}'

# Kiểm tra tiến độ thử thách
curl -X POST http://localhost:3000/api/rpc \
  -H "Content-Type: application/json" \
  -d '{"procedure":"rewards.getActiveChallenges","input":{"type":"daily"}}'
```

**Kiểm Thử Database:**

```javascript
// Kiểm tra các thành tựu đã được cấp
db.user_achievement.find({ userId: "USER_ID", completedAt: { $ne: null } })

// Kiểm tra tiến độ thử thách
db.user_challenge.find({ userId: "USER_ID", instanceId: "daily_2026-03-04" })

// Kiểm tra các lần mua
db.user_purchase.find({ userId: "USER_ID" })

// Kiểm tra kho đồ
db.user_inventory.findOne({ userId: "USER_ID" })
```

## Chỉ Số Thành Công (Success Metrics)

- **Tỷ lệ mở khóa thành tựu**: % người dùng đạt ít nhất 1 thành tựu trong tuần đầu
- **Tham gia thử thách**: % người dùng hoàn thành thử thách hàng ngày
- **Tương tác cửa hàng**: Số XP trung bình được chi tiêu cho mỗi người dùng
- **Tác động giữ chân**: So sánh tỷ lệ giữ chân giữa người dùng có/không có thành tựu
- **Tỷ lệ hoàn thành thói quen**: Đo lường xem phần thưởng có tăng hoàn thành hàng ngày không

## Lưu Ý (Notes)

- Kiểm tra thành tựu nên chạy bất đồng bộ (asynchronously) để tránh chặn việc hoàn thành thói quen
- Sử dụng MongoDB transactions cho các giao dịch mua hàng (trừ XP + chuyển vật phẩm)
- Sự kiện theo mùa tự động kích hoạt qua cron jobs
- Tất cả operations XP sử dụng `$inc` để ngăn chặn race conditions (theo pattern hiện có)
- Thông báo đẩy (push notifications) cho thành tựu sử dụng cơ sở hạ tầng `push.ts` hiện có
