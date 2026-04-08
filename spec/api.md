## API仕様（API）

参照実装: `sanhome-sales/src/app/api/**/route.ts`

共通:
- **Content-Type**: JSON（アップロードのみ `multipart/form-data`）
- **日時**: 受け取りは文字列（例: `2026-03-19T00:00:00`）→ サーバ側で `new Date(...)`
- **認証/認可**: 現状、API側に NextAuth セッション検証は実装されていない（多くのAPIが無条件に実行されうる）。仕様としては要決定。

---

## 1. Auth

### 1.1 NextAuth
- **GET/POST** `/api/auth/[...nextauth]`
  - NextAuthのハンドラをそのまま公開（`src/app/api/auth/[...nextauth]/route.ts`）

---

## 2. Users

### 2.1 ユーザー一覧
- **GET** `/api/users`
  - **Response**: `User[]`（`group` を含む）

### 2.2 ユーザー作成
- **POST** `/api/users`
  - **Request(JSON)**:
    - `name`: string
    - `email`: string
    - `password?`: string（未指定なら `password123`）
    - `role?`: `"sales" | "admin"`（未指定は `sales`）
  - **Response(201)**: 作成された `User`

### 2.3 ユーザー取得
- **GET** `/api/users/:id`
  - **Response**: `User`（`group` を含む）
  - **404**: userなし

### 2.4 ユーザー更新
- **PUT** `/api/users/:id`
  - **Request(JSON)**: 以下の任意項目
    - `name?`, `email?`, `role?`, `groupId?`（空文字は `null` として扱う）
    - `password?`（指定時 bcrypt でハッシュ化して保存）
  - **Response**: 更新後 `User`（`group` を含む）

### 2.5 ユーザー削除
- **DELETE** `/api/users/:id`
  - **Response**: `{ success: true }`

---

## 3. Groups

### 3.1 グループ一覧
- **GET** `/api/groups`
  - **Response**: `Group[]`（`users: {id,name}[]` を含む）

### 3.2 グループ作成
- **POST** `/api/groups`
  - **Request(JSON)**: `{ name: string }`
  - **400**: nameなし
  - **Response(201)**: `Group`

### 3.3 グループ更新
- **PUT** `/api/groups/:id`
  - **Request(JSON)**: `{ name: string }`
  - **Response**: 更新後 `Group`

### 3.4 グループ削除
- **DELETE** `/api/groups/:id`
  - **Response**: `{ success: true }`

---

## 4. Sales

### 4.1 売上一覧（検索）
- **GET** `/api/sales`
  - **Query**:
    - `userId?`: string（登録者 or 担当者に含まれる売上）
    - `startDate?`: datetime string
    - `endDate?`: datetime string
  - **Response**: `Sale[]`（`user:{id,name}` と `assignees:{id,name}[]` を含む）
  - **Sort**: `date desc`

### 4.2 売上作成
- **POST** `/api/sales`
  - **Request(JSON)**:
    - `userId`: string（登録者）
    - `date`: string（契約日）
    - `projectName`: string
    - `category`: string
    - `salesAmount`: number
    - `grossProfit`: number
    - `settlementDate?`: string（未指定は現在）
    - `isSettled?`: boolean（未指定は false）
    - `assigneeIds?`: string[]（未指定/空なら登録者を担当者として接続）
    - `profitRatios?`: object（JSON文字列として保存）
  - **Response(201)**: 作成された `Sale`（`user`, `assignees` を含む）

### 4.3 売上更新（決済フラグ）
- **PUT** `/api/sales/:id`
  - **Request(JSON)**: `{ isSettled?: boolean }`
  - **Response**: 更新後 `Sale`

### 4.4 売上削除
- **DELETE** `/api/sales/:id`
  - **Response**: `{ success: true }`

### 4.5 売上一括取り込み
- **POST** `/api/sales/import`
  - **Request(JSON)**: `{ rows: SaleRow[] }`
    - `SaleRow`: `{ userId, date, projectName, category, salesAmount, grossProfit }`
  - **Response(201)**: `{ imported: number }`

---

## 5. Expenses

### 5.1 経費一覧（検索）
- **GET** `/api/expenses`
  - **Query**:
    - `userId?`: string
    - `startDate?`, `endDate?`: datetime string（指定時はこちら優先）
    - `month?`: `YYYY-MM`（legacy）
  - **Response**: `Expense[]`（`user:{id,name}` を含む）
  - **Sort**: `date desc`

### 5.2 経費作成
- **POST** `/api/expenses`
  - **Request(JSON)**:
    - `userId`: string
    - `date`: string
    - `category`: string
    - `amount`: number
    - `receiptImageUrl?`: string | null
    - `memo?`: string | null
  - **Response(201)**: 作成された `Expense`

### 5.3 経費更新（所有者のみ）
- **PUT** `/api/expenses/:id`
  - **Request(JSON)**:
    - `userId`: string（所有者確認に使用）
    - `date?`, `category?`, `amount?`, `receiptImageUrl?`, `memo?`
  - **403**: 所有者不一致
  - **404**: 対象なし

### 5.4 経費削除（所有者のみ）
- **DELETE** `/api/expenses/:id?userId=...`
  - **403**: 所有者不一致
  - **404**: 対象なし

---

## 6. Schedules

### 6.1 予定一覧（検索）
- **GET** `/api/schedules`
  - **Query**:
    - `userId?`: string
    - `startDate?`, `endDate?`: datetime string（`startTime` に対して範囲）
  - **Response**: `Schedule[]`（`user:{id,name}` を含む）
  - **Sort**: `startTime asc`

### 6.2 予定作成
- **POST** `/api/schedules`
  - **Request(JSON)**:
    - `userId`: string
    - `startTime`: string
    - `endTime`: string
    - `title`: string
    - `location?`: string（未指定は空文字）
  - **Response(201)**: 作成された `Schedule`

### 6.3 予定更新（所有者のみ）
- **PUT** `/api/schedules/:id`
  - **Request(JSON)**:
    - `userId`: string（所有者確認に使用）
    - `startTime?`, `endTime?`, `title?`, `location?`
  - **403**: 所有者不一致
  - **404**: 対象なし

### 6.4 予定削除（所有者のみ）
- **DELETE** `/api/schedules/:id?userId=...`
  - **403**: 所有者不一致
  - **404**: 対象なし

---

## 7. Upload

### 7.1 画像アップロード
- **POST** `/api/upload`
  - **Request(FormData)**: `file`（`File`）
  - **Response**:
    - 成功: `{ success: true, url: "/uploads/<filename>" }`
    - 失敗: `{ success: false, error: string }`
