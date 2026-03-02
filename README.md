# We Grow

Ứng dụng theo dõi thói quen (habit tracking) kết hợp gamification và nhóm cùng phát triển. Người dùng tạo thói quen hàng ngày, hoàn thành để nhận XP, duy trì streak, lên level và cạnh tranh trên bảng xếp hạng cùng bạn bè.

Được xây dựng trên [Better-T-Stack](https://github.com/AmanVarshney01/create-better-t-stack).

## Tính năng chính

### Quản lý thói quen (Habits)
- Tạo thói quen với 3 chế độ tần suất: **hàng ngày** (daily), **hàng tuần** (weekly), hoặc **ngày cụ thể** (specific_days)
- Đánh dấu hoàn thành/bỏ hoàn thành theo ngày
- Theo dõi streak (chuỗi ngày liên tiếp) tự động — hỗ trợ cả 3 loại tần suất
- Lưu giữ streak dài nhất (longest streak)
- Xem lịch sử hoàn thành dạng calendar
- Tổng hợp thói quen cần làm hôm nay (today summary)
- Archive hoặc xóa thói quen

### Quản lý công việc (Todos)
- Tạo task một lần với 3 mức độ ưu tiên: **normal**, **important**, **urgent**
- Lọc theo trạng thái hoàn thành và mức ưu tiên
- Hoàn thành task nhận XP theo mức ưu tiên (10 / 20 / 30 XP)

### Hệ thống Gamification

**XP (Experience Points)** — nhận XP cho mọi hoạt động:

| Hành động | XP |
|-----------|-----|
| Hoàn thành thói quen | 10 |
| Hoàn thành todo (normal / important / urgent) | 10 / 20 / 30 |
| Bonus streak 7 ngày | 50 |
| Bonus streak 30 ngày | 200 |
| Bonus streak 100 ngày | 500 |
| Hoàn thành tất cả thói quen daily trong ngày | 20 |
| Hoàn thành onboarding | 10 |

**Level** — công thức: `XP cần cho level N = 100 × N × (N+1) / 2`

| Level | XP cần |
|-------|--------|
| 2 | 100 |
| 3 | 300 |
| 5 | 1,000 |
| 10 | 5,500 |

**Bảng xếp hạng** — xếp hạng toàn cầu và theo nhóm dựa trên XP, streak, level.

**Lịch sử XP** — xem chi tiết từng giao dịch XP (có phân trang).

### Nhóm (Groups)
- Tạo nhóm với 2 chế độ:
  - **Together** — tất cả thành viên cùng làm chung thói quen nhóm
  - **Share** — chia sẻ tiến độ cá nhân trong nhóm
- Mời thành viên qua **invite code** 6 ký tự (chữ hoa + số)
- Phân quyền 3 cấp: **Owner** → **Moderator** → **Member**
  - Owner: quản lý nhóm, đổi quyền thành viên, tạo lại invite code
  - Moderator: duyệt/xóa thành viên, tạo thói quen nhóm (chế độ together)
  - Member: xem tiến độ, tham gia thói quen nhóm
- Xem tiến độ hàng ngày của tất cả thành viên
- Bảng xếp hạng riêng cho nhóm

### Onboarding
- Flow thiết lập ban đầu: chọn mục tiêu cá nhân, múi giờ
- Nhận 10 XP khi hoàn thành

### Thông báo (Notifications)
- Web Push notifications (browser)
- Tạo nhắc nhở (reminders) theo giờ, liên kết với thói quen hoặc todo

## Công nghệ sử dụng

| Layer | Công nghệ |
|-------|-----------|
| Frontend | Next.js 16, React 19, TailwindCSS 4, shadcn/ui |
| API | oRPC (end-to-end type-safe RPC + OpenAPI) |
| Database | MongoDB + Mongoose |
| Auth | Better-Auth (email/password) |
| State | TanStack React Query + TanStack React Form |
| Validation | Zod 4 |
| Build | Turborepo + pnpm workspaces |
| Language | TypeScript 5 (strict mode) |
| PWA | Web Push API, Web App Manifest |

## Cấu trúc dự án

```
we-grow/
├── apps/
│   └── web/                  # Next.js fullstack app (port 3001)
│       ├── src/app/          # App Router pages (/login, /dashboard, ...)
│       ├── src/components/   # UI components (shadcn/ui, forms, header)
│       ├── src/lib/          # Auth client, utilities
│       └── src/utils/        # oRPC client setup
├── packages/
│   ├── api/                  # oRPC procedures, routers, business logic
│   │   ├── src/routers/      # 6 routers: habits, todos, groups, gamification, onboarding, notifications
│   │   ├── src/lib/          # XP helpers, invite code generator, push utility
│   │   └── src/middlewares/  # Group authorization
│   ├── auth/                 # Better-Auth config + MongoDB adapter
│   ├── db/                   # Mongoose models (14 models) + ID generator
│   │   └── src/models/       # Tất cả Mongoose schemas
│   ├── env/                  # Environment validation (T3 Env)
│   └── config/               # Shared tsconfig
```

## Cài đặt

### Yêu cầu
- Node.js (tương thích pnpm 10)
- pnpm 10.16+
- MongoDB (local hoặc MongoDB Atlas)

### Các bước

```bash
# 1. Clone repo
git clone <repo-url>
cd we-grow

# 2. Cài dependencies
pnpm install

# 3. Tạo file environment
```

Tạo file `apps/web/.env` với nội dung:

```env
DATABASE_URL=mongodb://localhost:27017/we-grow
BETTER_AUTH_SECRET=your-secret-key-at-least-32-characters-long
BETTER_AUTH_URL=http://localhost:3001
CORS_ORIGIN=http://localhost:3001

# Optional - cho Web Push notifications
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
```

```bash
# 4. Chạy dev server
pnpm run dev
```

Truy cập [http://localhost:3001](http://localhost:3001)

## Lệnh thường dùng

| Lệnh | Mô tả |
|-------|-------|
| `pnpm run dev` | Chạy dev server (tất cả packages) |
| `pnpm run dev:web` | Chỉ chạy web app |
| `pnpm run build` | Build production |
| `pnpm run check-types` | Kiểm tra TypeScript types |
| `cd apps/web && pnpm run generate-pwa-assets` | Tạo PWA assets |

## API

Tất cả API endpoints được expose qua oRPC tại `/api/rpc`.

Xem tài liệu API tương tác tại: [http://localhost:3001/api/rpc/api-reference](http://localhost:3001/api/rpc/api-reference)

### Các router

| Router | Endpoints | Mô tả |
|--------|-----------|-------|
| `onboarding` | `getStatus`, `complete` | Flow onboarding |
| `habits` | `list`, `getById`, `create`, `update`, `archive`, `delete`, `complete`, `uncomplete`, `getCompletions`, `todaySummary` | CRUD + streak + XP |
| `todos` | `list`, `create`, `update`, `delete`, `complete`, `uncomplete` | CRUD + XP theo priority |
| `groups` | `listMy`, `getById`, `create`, `update`, `delete`, `join`, `leave`, `lookupByInviteCode`, `regenerateInviteCode`, `approveMember`, `removeMember`, `changeMemberRole`, `createGroupHabit`, `getMemberProgress` | Quản lý nhóm đầy đủ |
| `gamification` | `getProfile`, `getXpHistory`, `getGlobalLeaderboard`, `getGroupLeaderboard` | XP, level, bảng xếp hạng |
| `notifications` | `subscribe`, `unsubscribe`, `getVapidPublicKey`, `listReminders`, `createReminder`, `updateReminder`, `deleteReminder` | Push + reminders |

### Authentication

- Đăng ký / đăng nhập qua Better-Auth tại `/api/auth/`
- Tất cả API (trừ `healthCheck`) yêu cầu session cookie
- API trả về `UNAUTHORIZED` nếu chưa đăng nhập
- Các thao tác nhóm kiểm tra quyền (owner/moderator/member) trước khi thực hiện

## Database

14 collections trong MongoDB:

| Collection | Mô tả |
|------------|-------|
| `user` | Thông tin user (Better-Auth) |
| `session` | Session đăng nhập |
| `account` | OAuth/provider accounts |
| `verification` | Token xác thực |
| `user_profile` | Goals, XP, level, timezone, onboarding status |
| `habit` | Thói quen: title, frequency, streak tracking |
| `habit_completion` | Log hoàn thành (unique per habit+user+date) |
| `todo` | Task một lần với priority |
| `group` | Nhóm: name, mode, invite code |
| `group_member` | Thành viên nhóm: role, status |
| `group_habit` | Thói quen chung cho nhóm together |
| `xp_transaction` | Lịch sử XP (audit log) |
| `push_subscription` | Web Push subscriptions |
| `reminder` | Nhắc nhở theo giờ |

## Logic nghiệp vụ

### Tính streak

- **Daily**: Nếu ngày hoàn thành gần nhất = hôm qua → streak + 1, ngược lại reset về 1
- **Weekly**: Đếm số lần hoàn thành trong tuần, nếu đạt target thì kiểm tra tuần trước
- **Specific days**: Kiểm tra ngày scheduled trước đó có được hoàn thành không
- `longestStreak` luôn được cập nhật = `max(currentStreak, longestStreak)`
- Streak chỉ tính khi ghi (on-write), không cần background job

### Invite code

- 6 ký tự uppercase alphanumeric (`A-Z0-9`)
- Sinh từ `crypto.randomBytes`, đảm bảo unique trong DB
- Owner có thể tạo lại (regenerate) bất cứ lúc nào

### Luồng request

```
Client (oRPC) → POST /api/rpc → createContext (extract session) → Router → Mongoose → MongoDB
```
