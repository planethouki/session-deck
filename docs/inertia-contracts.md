# Inertiaインターフェース設計

## 目的

LaravelのControllerとReactページの境界を定義する。各ページが受け取るProps、送信するフォーム、成功後の遷移、部分リロード対象を固定し、バックエンドとフロントエンドの実装差異を防ぐ。

## 基本規約

### キー名

- Inertia Propsとフォームpayloadは`snake_case`に統一する。
- TypeScriptの型も通信境界では`snake_case`を使用する。
- 現在の`appName`は実装時に`app_name`へ変更する。
- DBカラムをそのまま無制限に公開せず、Resourceまたは専用Presenterで明示的に整形する。

### IDとURL

- IDは数値として渡す。
- 公開イベントの識別子は`slug`を渡す。
- 更新可能な画面には`actions`オブジェクトを渡す。
- 許可されない操作のURLは`null`とする。
- UIは`actions`を操作表示の判断に使えるが、サーバー側でも必ずPolicyを再確認する。

```ts
type ActionUrl = string | null;

type EventActions = {
  view: ActionUrl;
  edit: ActionUrl;
  apply: ActionUrl;
  manage: ActionUrl;
};
```

### 日時

- 日時はISO 8601文字列で渡す。
- DBではUTC、イベントにはIANAタイムゾーン名を持たせる。
- 表示はフロントエンドで`Intl.DateTimeFormat`を使い、イベントの`timezone`を指定する。
- 日時入力はイベントのタイムゾーンのローカル値として送信し、Laravel側でUTCへ変換する。
- 期限切れ判定など認可に関わる判断はサーバーを正とし、クライアント時計だけに依存しない。

### 金額

- 金額は最小通貨単位の整数とISO 4217通貨コードで渡す。
- 例：`{ fee_amount: 3000, currency: "JPY" }`
- 表示は`Intl.NumberFormat`を使用する。

### 状態値

```ts
type EventStatus = 'draft' | 'published' | 'closed' | 'completed' | 'cancelled';
type ParticipationStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';
type ParticipationType = 'performer' | 'observer';
type PartEntryStatus = 'applied' | 'on_hold' | 'selected' | 'rejected' | 'cancelled';
type SlotStatus = 'open' | 'selecting' | 'filled' | 'closed' | 'reopened';
type SongStatus = 'incomplete' | 'adjusting' | 'formed';
```

表示ラベルは共通マッピングから取得し、保存値を直接画面へ表示しない。

## 共通PageProps

`resources/js/types/global.d.ts`へ次を定義する。

```ts
type AuthUser = {
  id: number;
  name: string;
  email: string;
  role: 'user' | 'admin';
  email_verified_at: string | null;
};

type FlashProps = {
  success?: string;
  status?: string;
  error?: string;
  conflict?: string;
};

declare module '@inertiajs/core' {
  interface PageProps {
    app_name: string;
    auth: { user: AuthUser | null };
    flash: FlashProps;
    unread_notifications_count: number;
  }
}
```

`unread_notifications_count`は認証済みユーザーだけ集計し、未認証時は0とする。

## 共通表示型

```ts
type InstrumentOption = {
  id: number;
  name: string;
  slug: string;
};

type GenreOption = {
  id: number;
  name: string;
  slug: string;
};

type UserSummary = {
  id: number;
  name: string;
};

type PaginationLink = {
  url: string | null;
  label: string;
  active: boolean;
};

type Paginated<T> = {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number | null;
  to: number | null;
  links: PaginationLink[];
};
```

## イベント型

```ts
type EventSummary = {
  id: number;
  slug: string;
  title: string;
  status: EventStatus;
  starts_at: string;
  ends_at: string;
  timezone: string;
  venue_name: string;
  region: string;
  fee_amount: number;
  currency: string;
  genres: GenreOption[];
  level_description: string | null;
  participation_deadline: string | null;
  shortage_instruments: InstrumentOption[];
  actions: Pick<EventActions, 'view' | 'apply' | 'manage'>;
};

type EventDetail = EventSummary & {
  description: string | null;
  venue_address: string | null;
  participant_capacity: number | null;
  approved_participants_count: number;
  remaining_capacity: number | null;
  entry_deadline: string | null;
  max_entry_songs_per_participant: number | null;
  max_assignment_songs_per_participant: number | null;
  owner: UserSummary;
  staff: UserSummary[];
  actions: EventActions;
};
```

一般公開Propsには応募者・参加者の氏名、メールアドレス、コメントを含めない。

## 曲・パート型

```ts
type SongResourceView = {
  id: number;
  type: 'reference_audio' | 'sheet_music' | 'chord_chart' | 'other';
  visibility: 'public' | 'participants';
  title: string;
  url: string;
  sort_order: number;
};

type PublicSongResource = Omit<SongResourceView, 'visibility'>;

type PublicPartSlot = {
  id: number;
  instrument: InstrumentOption;
  label: string;
  required_count: number;
  confirmed_count: number;
  applicant_count: number;
  is_required: boolean;
  status: SlotStatus;
};

type PublicEventSong = {
  id: number;
  title: string;
  artist_name: string | null;
  original_key: string | null;
  performance_key: string | null;
  status: SongStatus;
  setlist_order: number | null;
  slots: PublicPartSlot[];
  public_resources: PublicSongResource[];
};
```

公開画面の`confirmed_count`は人数だけを返し、確定者名は返さない。`public_resources`には`visibility = public`の資料だけを含める。承認済み参加者用ページでは担当者名と閲覧可能な全資料を含む別の型を使用する。

## 自分の参加・応募型

```ts
type SelfParticipation = {
  id: number;
  participation_type: ParticipationType;
  status: ParticipationStatus;
  instruments: InstrumentOption[];
  experience_level: string | null;
  introduction: string | null;
  message_to_organizer: string | null;
  decision_message: string | null;
  applied_at: string;
  decided_at: string | null;
  actions: {
    cancel: ActionUrl;
    submit_entry: ActionUrl;
  };
};

type SelfPartEntry = {
  id: number;
  priority: number | null;
  status: PartEntryStatus;
  song: Pick<PublicEventSong, 'id' | 'title' | 'artist_name' | 'performance_key'>;
  slot: Pick<PublicPartSlot, 'id' | 'instrument' | 'label' | 'status'>;
  requested_key: string | null;
  can_chorus: boolean;
  can_switch_instrument: boolean;
  comment: string | null;
  decision_message: string | null;
  actions: {
    update: ActionUrl;
    cancel: ActionUrl;
  };
};

type SelfAssignment = {
  id: number;
  song: Pick<PublicEventSong, 'id' | 'title' | 'artist_name' | 'performance_key' | 'setlist_order'>;
  slot: Pick<PublicPartSlot, 'id' | 'instrument' | 'label'>;
  confirmed_at: string;
};
```

## 公開・参加者ページ契約

### Events/Index

```ts
type EventsIndexProps = {
  events: Paginated<EventSummary>;
  filters: {
    date_from: string | null;
    date_to: string | null;
    region: string | null;
    genre: string | null;
    instrument: string | null;
  };
  filter_options: {
    regions: string[];
    genres: GenreOption[];
    instruments: InstrumentOption[];
  };
};
```

フィルター変更時は`events`と`filters`だけを部分リロードする。URLクエリを正とし、空値は送信しない。

### Events/Show

```ts
type EventsShowProps = {
  event: EventDetail;
  songs: PublicEventSong[];
  viewer: {
    participation: SelfParticipation | null;
    next_action: 'login' | 'apply' | 'wait_for_approval' | 'submit_entries' | 'view_assignments' | 'none';
  };
};
```

未認証ユーザーの`viewer.participation`はNULLとする。非公開の曲・パート枠は含めない。

### Events/Participation/Create

```ts
type ParticipationCreateProps = {
  event: Pick<EventDetail,
    'id' | 'slug' | 'title' | 'starts_at' | 'timezone' |
    'participation_deadline' | 'remaining_capacity'>;
  profile_defaults: {
    experience_level: string | null;
    introduction: string | null;
    instrument_ids: number[];
  };
  instruments: InstrumentOption[];
  actions: { store: string };
};
```

### Events/Entries/Index

```ts
type EntrySlot = PublicPartSlot & {
  can_apply: boolean;
  unavailable_reason: string | null;
  actions: { apply: ActionUrl };
};

type EntrySong = Omit<PublicEventSong, 'slots' | 'public_resources'> & {
  slots: EntrySlot[];
  resources: SongResourceView[];
};

type EntriesIndexProps = {
  event: Pick<EventDetail,
    'id' | 'slug' | 'title' | 'entry_deadline' |
    'max_entry_songs_per_participant'>;
  participation: SelfParticipation;
  songs: EntrySong[];
  entries: SelfPartEntry[];
  limits: {
    active_song_count: number;
    max_song_count: number | null;
    remaining_song_count: number | null;
  };
  actions: {
    store: ActionUrl;
    reorder: ActionUrl;
  };
};
```

`remaining_song_count`は無制限ならNULL。同じ曲の別パートへ応募しても`active_song_count`は増えない。

応募・取消・順位更新後は`entries`、`songs`、`limits`を再取得する。

### My/Events/Index

```ts
type MyEventSummary = {
  event: EventSummary;
  participation_status: ParticipationStatus;
  participation_type: ParticipationType;
  active_entries_count: number;
  active_assignments_count: number;
  next_action: 'wait' | 'submit_entries' | 'prepare' | 'none';
};

type MyEventsIndexProps = {
  events: Paginated<MyEventSummary>;
  filters: { status: string | null };
};
```

### My/Events/Show

```ts
type ParticipantSongMember = {
  user: UserSummary;
  slot_label: string;
  instrument: InstrumentOption;
};

type ParticipantEventSong = Omit<PublicEventSong, 'public_resources'> & {
  resources: SongResourceView[];
  assigned_members: ParticipantSongMember[];
};

type MyEventShowProps = {
  event: EventDetail;
  participation: SelfParticipation;
  entries: SelfPartEntry[];
  assignments: SelfAssignment[];
  songs: ParticipantEventSong[];
  announcements: AnnouncementView[];
  actions: {
    edit_entries: ActionUrl;
    cancel_participation: ActionUrl;
  };
};
```

担当者名と参加者限定資料は、承認済みかつ未キャンセルの参加者にだけ公開する。その他の状態では`songs`を空配列とし、公開イベント情報だけを別途表示する。

### Profile/Edit

```ts
type ProfileEditProps = {
  profile: {
    name: string;
    bio: string | null;
    region: string | null;
    experience_level: string | null;
    instruments: Array<{
      instrument_id: number;
      experience_years: number | null;
      level: string | null;
      note: string | null;
    }>;
  };
  instruments: InstrumentOption[];
  actions: {
    update_profile: string;
    update_instruments: string;
  };
};
```

## 主催者共通型

```ts
type ManagedEventContext = {
  id: number;
  slug: string;
  title: string;
  status: EventStatus;
  starts_at: string;
  timezone: string;
  viewer_role: 'owner' | 'staff';
  counts: {
    pending_participations: number;
    unreviewed_entries: number;
    shortage_slots: number;
    formed_songs: number;
  };
  navigation: {
    dashboard: string;
    participations: string;
    songs: string;
    lineup: string;
    setlist: string;
    announcements: string;
    settings: string;
  };
};

type ManagedPageProps = {
  managed_event: ManagedEventContext;
};
```

すべてのイベント管理ページは`managed_event`を共通で受け取り、ManageEventLayoutへ渡す。

## 主催者ページ契約

### Manage/Events/Index

```ts
type ManagedEventSummary = EventSummary & {
  viewer_role: 'owner' | 'staff';
  pending_participations_count: number;
  shortage_slots_count: number;
};

type ManageEventsIndexProps = {
  events: Paginated<ManagedEventSummary>;
  actions: { create: string };
};
```

### Manage/Events/Create

```ts
type ManageEventCreateProps = {
  timezone_options: Array<{ value: string; label: string }>;
  initial_timezone: string;
  actions: { store: string };
};
```

### Manage/Events/Show

```ts
type ManagementTask = {
  id: string;
  type: 'participation' | 'entry_conflict' | 'shortage' | 'publish_check';
  label: string;
  description: string;
  count: number | null;
  url: string;
  urgency: 'normal' | 'soon' | 'overdue';
};

type ManageEventShowProps = ManagedPageProps & {
  summary: ManagedEventContext['counts'];
  tasks: ManagementTask[];
  publish_checklist: PublishChecklistItem[];
  actions: {
    publish: ActionUrl;
    close: ActionUrl;
    complete: ActionUrl;
    cancel: ActionUrl;
  };
};
```

### Manage/Events/Edit

```ts
type ManageEventEditProps = ManagedPageProps & {
  event: EventDetail;
  genres: GenreOption[];
  selected_genre_ids: number[];
  actions: { update: string };
};
```

### Manage/Events/Participations/Index

```ts
type ManagedParticipation = {
  id: number;
  user: UserSummary;
  participation_type: ParticipationType;
  status: ParticipationStatus;
  instruments: InstrumentOption[];
  experience_level: string | null;
  introduction: string | null;
  message_to_organizer: string | null;
  decision_message: string | null;
  applied_at: string;
  actions: {
    approve: ActionUrl;
    reject: ActionUrl;
  };
};

type ManageParticipationsIndexProps = ManagedPageProps & {
  participations: Paginated<ManagedParticipation>;
  filters: {
    status: ParticipationStatus | null;
    participation_type: ParticipationType | null;
  };
  capacity: {
    participant_capacity: number | null;
    approved_count: number;
    remaining_capacity: number | null;
  };
};
```

承認・見送り後は`participations`、`capacity`、`managed_event.counts`を部分リロードする。

### Manage/Events/Songs/Index

```ts
type ManagedPartSlot = PublicPartSlot & {
  note: string | null;
  is_open: boolean;
  was_filled: boolean;
  actions: {
    update: ActionUrl;
    delete: ActionUrl;
  };
};

type ManagedSongResource = SongResourceView & {
  actions: {
    update: ActionUrl;
    delete: ActionUrl;
  };
};

type ManagedEventSong = {
  id: number;
  title: string;
  artist_name: string | null;
  original_key: string | null;
  performance_key: string | null;
  duration_seconds: number | null;
  structure_note: string | null;
  performance_note: string | null;
  setlist_order: number | null;
  is_published: boolean;
  status: SongStatus;
  slots: ManagedPartSlot[];
  resources: ManagedSongResource[];
  actions: {
    update: ActionUrl;
    delete_or_hide: ActionUrl;
    add_slot: ActionUrl;
    add_resource: ActionUrl;
  };
};

type ManageSongsIndexProps = ManagedPageProps & {
  songs: ManagedEventSong[];
  instruments: InstrumentOption[];
  actions: { store_song: string };
};
```

### Manage/Events/Lineup/Show

```ts
type LineupCell = {
  slot_id: number;
  instrument: InstrumentOption;
  label: string;
  status: SlotStatus;
  required_count: number;
  confirmed_count: number;
  applicant_count: number;
  confirmed_users: UserSummary[];
  detail_url: string;
};

type LineupSong = {
  id: number;
  title: string;
  artist_name: string | null;
  status: SongStatus;
  cells: LineupCell[];
};

type LineupApplicant = {
  entry_id: number;
  user: UserSummary;
  priority: number;
  experience_level: string | null;
  instrument_experience_years: number | null;
  comment: string | null;
  entry_status: PartEntryStatus;
  active_assignment_id: number | null;
  actions: {
    hold: ActionUrl;
    reject: ActionUrl;
    assign: ActionUrl;
    release: ActionUrl;
  };
};

type SelectedLineupSlot = {
  slot: LineupCell;
  song: Pick<ManagedEventSong, 'id' | 'title' | 'artist_name' | 'performance_key'>;
  applicants: LineupApplicant[];
};

type ManageLineupShowProps = ManagedPageProps & {
  lineup: LineupSong[];
  instrument_columns: InstrumentOption[];
  selected_slot: SelectedLineupSlot | null;
  filters: { slot_id: number | null };
};
```

初回表示では`selected_slot`をNULLにする。セル選択時は同じURLへ`slot_id`を付け、`selected_slot`だけを部分リロードする。担当確定・解除・保留・見送り後は`lineup`、`selected_slot`、`managed_event.counts`を再取得する。

### Manage/Events/Setlist/Edit

`GET /manage/events/{event:slug}/setlist`（`manage.events.setlist.edit`）で表示する。

```ts
type SetlistSong = {
  id: number;
  title: string;
  artist_name: string | null;
  performance_key: string | null;
  duration_seconds: number | null;
  order: number;
  members: ParticipantSongMember[];
};

type ManageSetlistEditProps = ManagedPageProps & {
  songs: SetlistSong[];
  total_duration_seconds: number;
  actions: { update: string };
};
```

### お知らせ型と管理画面

```ts
type AnnouncementView = {
  id: number;
  title: string;
  body: string;
  published_at: string | null;
  send_email: boolean;
  created_by: UserSummary;
};

type ManagedAnnouncement = AnnouncementView & {
  email_queued_at: string | null;
  actions: {
    update: ActionUrl;
    publish: ActionUrl;
    delete: ActionUrl;
  };
};

type ManageAnnouncementsIndexProps = ManagedPageProps & {
  announcements: Paginated<ManagedAnnouncement>;
  recipient_count: number;
  actions: { store: string };
};
```

公開済みお知らせの`update`と`delete`はNULLにする。

### Manage/Events/Staff/Index

```ts
type ManagedStaff = UserSummary & {
  role: 'owner' | 'staff';
  actions: { remove: ActionUrl; transfer_owner: ActionUrl };
};

type ManageStaffIndexProps = ManagedPageProps & {
  staff: ManagedStaff[];
  actions: { add: ActionUrl };
};
```

### PublishChecklistItem

```ts
type PublishChecklistItem = {
  key: string;
  label: string;
  passed: boolean;
  fix_url: string | null;
};
```

## 通知ページ契約

```ts
type NotificationView = {
  id: string;
  type: string;
  message: string;
  occurred_at: string;
  read_at: string | null;
  target_url: string | null;
  actions: { mark_read: ActionUrl };
};

type NotificationsIndexProps = {
  notifications: Paginated<NotificationView>;
  actions: { mark_all_read: ActionUrl };
};
```

通知一覧表示、個別既読、一括既読のルートをバックエンド設計に追加する。通知の`data`全体はフロントへ渡さず、表示用の固定フィールドへ変換する。

## フォームpayload

### プロフィール

```ts
type UpdateProfilePayload = {
  name: string;
  bio: string | null;
  region: string | null;
  experience_level: string | null;
};

type UpdateProfileInstrumentsPayload = {
  instruments: Array<{
    instrument_id: number;
    experience_years: number | null;
    level: string | null;
    note: string | null;
  }>;
};
```

### イベント

```ts
type StoreEventPayload = {
  title: string;
  starts_at: string;
  ends_at: string;
  timezone: string;
  venue_name: string;
  region: string;
};

type UpdateEventPayload = StoreEventPayload & {
  description: string | null;
  venue_address: string | null;
  fee_amount: number;
  currency: string;
  participant_capacity: number | null;
  level_description: string | null;
  participation_deadline: string | null;
  entry_deadline: string | null;
  max_entry_songs_per_participant: number | null;
  max_assignment_songs_per_participant: number | null;
  genre_ids: number[];
};
```

日時文字列はイベントの`timezone`における`YYYY-MM-DDTHH:mm`形式で送信する。

### 参加申込

```ts
type StoreParticipationPayload = {
  participation_type: ParticipationType;
  instrument_ids: number[];
  experience_level: string | null;
  introduction: string | null;
  message_to_organizer: string | null;
};
```

`performer`では`instrument_ids`を1件以上必須、`observer`では空配列に正規化する。

### 曲・パート応募

```ts
type StorePartEntryPayload = {
  song_part_slot_id: number;
  requested_key: string | null;
  can_chorus: boolean;
  can_switch_instrument: boolean;
  comment: string | null;
};

type UpdatePartEntryPayload = Omit<StorePartEntryPayload, 'song_part_slot_id'>;

type UpdateEntryPrioritiesPayload = {
  entry_ids: number[];
};
```

`entry_ids`は本人の有効応募を希望順位順ですべて送る。部分集合、重複、他人の応募、無効状態の応募を含む場合は拒否する。

### 課題曲

```ts
type StoreEventSongPayload = {
  title: string;
  artist_name: string | null;
  original_key: string | null;
  performance_key: string | null;
  duration_seconds: number | null;
  structure_note: string | null;
  performance_note: string | null;
  is_published: boolean;
};
```

### パート枠

```ts
type StorePartSlotPayload = {
  instrument_id: number;
  label: string;
  required_count: number;
  is_required: boolean;
  is_open: boolean;
  note: string | null;
};
```

### 演奏資料

```ts
type StoreSongResourcePayload = {
  type: SongResourceView['type'];
  visibility: SongResourceView['visibility'];
  title: string;
  url: string;
  sort_order: number;
};
```

### 審査・編成

```ts
type ReviewPayload = {
  decision_message: string | null;
};

type ReleaseAssignmentPayload = {
  release_reason: string | null;
};

type UpdateSetlistPayload = {
  songs: Array<{ id: number; order: number }>;
};
```

参加承認、見送り、応募保留、応募見送りは`ReviewPayload`を使用する。担当確定はpayloadなしとする。

### お知らせ

```ts
type StoreAnnouncementPayload = {
  title: string;
  body: string;
};

type PublishAnnouncementPayload = {
  send_email: boolean;
};
```

公開時に`send_email`を確定し、公開後は変更できない。

### 共同運営者

```ts
type AddEventStaffPayload = { email: string };
type TransferEventOwnerPayload = { user_id: number };
```

共同運営者追加は、登録済みかつメール確認済みユーザーの完全一致メールアドレスで行う。検索候補としてユーザー情報を公開しない。

## 更新後の遷移

| 操作 | 成功後 |
| --- | --- |
| イベント下書き作成 | `manage.events.edit`へ303リダイレクト |
| イベント設定更新 | 同じ編集画面へ戻る |
| イベント公開・終了・中止 | 主催者ダッシュボードへ戻る |
| 参加申込 | `my.events.show`へ303リダイレクト |
| 参加キャンセル | `my.events.show`へ戻る |
| 応募追加・更新・取消 | 応募画面へ戻り関連Propsを再取得 |
| 希望順位一括更新 | 応募画面へ戻り`entries`を再取得 |
| 参加承認・見送り | 参加申込管理へ戻る |
| 担当確定・解除・保留・見送り | `slot_id`を維持して編成表へ戻る |
| 曲・パート枠・資料更新 | 課題曲管理へ戻る |
| セットリスト更新 | セットリスト画面へ戻る |
| お知らせ下書き保存・公開 | お知らせ一覧へ戻る |
| 共同運営者変更 | 共同運営者画面へ戻る |

更新リクエストはInertiaが適切に追従できるよう、Laravel側では原則303リダイレクトを返す。

## 部分リロード

| 画面・操作 | 再取得するProps |
| --- | --- |
| イベント一覧のフィルター | `events`, `filters` |
| 応募追加・取消 | `entries`, `songs`, `limits`, `flash` |
| 希望順位変更 | `entries`, `flash` |
| 参加承認・見送り | `participations`, `capacity`, `managed_event`, `flash` |
| 編成セル選択 | `selected_slot` |
| 担当確定・解除 | `lineup`, `selected_slot`, `managed_event`, `flash` |
| 通知既読 | `notifications`, `unread_notifications_count` |

権限や状態が変化する操作では、操作URLを含む対象Propsも必ず再取得する。

## エラー契約

### 入力エラー

Laravel標準のValidation Error Bagを使用し、フォームフィールド名と一致させる。

配列項目の例：

- `instrument_ids.0`
- `entry_ids.2`
- `songs.1.order`

### 業務競合

同時操作により前提が変わった場合は、例外をSQLエラーのまま返さず、ユーザー向けメッセージへ変換する。

例：

- 「直前にこのパートの担当が確定しました」
- 「定員に達したため承認できませんでした」
- 「応募状況が変更されています。最新の順位を確認してください」

Inertiaでは元画面へ戻し、`flash.conflict`へメッセージを設定する。対象Propsを再取得して最新状態を表示する。

### 認可・存在

- 未認証：ログイン画面へリダイレクト
- メール未確認：確認画面へリダイレクト
- 権限なし：403ページ
- 別イベントに属する子リソース、非公開で閲覧不能なリソース：404ページ

## 契約テスト

LaravelのFeature Testで`assertInertia`を使用し、少なくとも以下を確認する。

- 各ルートが期待するInertiaコンポーネント名を返す。
- 必須Propsとネスト構造が存在する。
- 公開ページに応募者名、メール、コメントが含まれない。
- observerの応募Action URLがNULLになる。
- staffとownerで操作URLが正しく異なる。
- 状態遷移後に操作URLとstatusが更新される。
- 部分リロード対象だけでもページが正常に更新できる。
- 競合時に`flash.conflict`と最新Propsが返る。

TypeScriptでは`tsc --noEmit`を実行し、ページPropsとフォームpayloadの型不一致を検出する。

## 実装順

1. 共通PagePropsと共通表示型
2. Laravel ResourceまたはPresenter
3. 公開イベント一覧・詳細契約
4. 主催イベント作成・設定契約
5. 参加申込・マイセッション契約
6. 曲・パート応募と順位更新契約
7. 課題曲・パート枠・資料契約
8. 参加申込管理と編成表契約
9. セットリスト・お知らせ・通知契約
10. `assertInertia`による契約テスト
