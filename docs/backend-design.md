# バックエンド・ルート設計

## アーキテクチャ方針

既存構成のLaravel 12、Inertia.js、Reactを前提とする。MVPでは独立したJSON APIを設けず、次の方式に統一する。

- GETリクエストはInertiaページを返す。
- POST、PATCH、DELETEは処理後にリダイレクトする。
- 入力検証はForm Requestへ分離する。
- 認可はPolicyで行い、画面表示の可否だけに依存しない。
- 複数テーブルを更新する業務処理はActionクラスへ分離する。
- 状態値はPHP Enumで表現する。
- 通知送信はLaravel NotificationとQueueを使用する。

コントローラーから直接、編成確定やキャンセルの複数更新を行わない。

## ディレクトリ構成

```text
app/
  Actions/
    Events/
    Participations/
    Entries/
    Assignments/
    Announcements/
  Enums/
  Http/
    Controllers/
      Events/
      Manage/
      Profile/
    Requests/
      Events/
      Participations/
      Entries/
      Manage/
  Models/
  Notifications/
  Policies/
routes/
  web.php
  events.php
  manage.php
```

`routes/web.php`から`events.php`と`manage.php`を読み込む。既存の認証ルートと管理者ルートは`web.php`に残す。

## URL設計の原則

- 公開イベントURLには自動生成したslugを使う。
- slugは公開後に変更しない。
- 公開側は`/events/...`、主催者側は`/manage/events/...`に分ける。
- 通常の登録・編集はREST形式にする。
- 公開、承認、確定などの状態遷移は、意図が分かるコマンド形式のURLにする。
- 子リソースは親Eventと同一イベントに属することを必ず検証する。

## 公開ルート

認証なしでアクセスできる。

| Method | URL | Route name | Controller |
| --- | --- | --- | --- |
| GET | `/events` | `events.index` | `Events\EventController@index` |
| GET | `/events/{event:slug}` | `events.show` | `Events\EventController@show` |

一覧で扱うクエリ：

- `date_from`
- `date_to`
- `region`
- `genre`
- `instrument`
- `page`

未公開、開催中止、削除済みイベントは公開ルートから取得できないよう、公開用クエリスコープを使用する。

## プロフィールルート

`auth`と`verified`を必須とする。

| Method | URL | Route name | Controller |
| --- | --- | --- | --- |
| GET | `/profile` | `profile.edit` | `Profile\ProfileController@edit` |
| PATCH | `/profile` | `profile.update` | `Profile\ProfileController@update` |
| PUT | `/profile/instruments` | `profile.instruments.update` | `Profile\ProfileInstrumentController@update` |

楽器一覧は一括置換し、更新全体をトランザクションで処理する。

## 参加者ルート

`auth`と`verified`を必須とする。

| Method | URL | Route name | 用途 |
| --- | --- | --- | --- |
| GET | `/my/events` | `my.events.index` | 参加予定・申込中イベント一覧 |
| GET | `/my/events/{event:slug}` | `my.events.show` | 自分の申込、応募、担当、資料 |
| GET | `/events/{event:slug}/participation` | `events.participation.create` | 参加申込フォーム |
| POST | `/events/{event:slug}/participation` | `events.participation.store` | 参加申込 |
| DELETE | `/events/{event:slug}/participation` | `events.participation.destroy` | 参加キャンセル |
| GET | `/events/{event:slug}/entries` | `events.entries.index` | 曲・パート応募画面 |
| POST | `/events/{event:slug}/entries` | `events.entries.store` | 応募追加 |
| PUT | `/events/{event:slug}/entries/priorities` | `events.entries.priorities.update` | 有効応募の希望順位を一括更新 |
| PATCH | `/events/{event:slug}/entries/{entry}` | `events.entries.update` | 希望順位・コメント変更 |
| DELETE | `/events/{event:slug}/entries/{entry}` | `events.entries.destroy` | 応募取消 |

参加者本人のParticipationとPartEntryだけを操作できる。順位交換は一括更新ルートを使い、Participationをロックしたトランザクション内で行う。担当確定済みの応募取消はAssignmentを直接解除せず、参加キャンセルまたは運営者への連絡を案内する。

`entries/priorities`は`entries/{entry}`より前にルート定義し、`priorities`がモデルIDとして解決されないようにする。

## 主催者ルート

`auth`と`verified`を必須とし、各操作をPolicyで認可する。

### イベント管理

| Method | URL | Route name | 用途 |
| --- | --- | --- | --- |
| GET | `/manage/events` | `manage.events.index` | 主催・共同運営イベント一覧 |
| GET | `/manage/events/create` | `manage.events.create` | 新規作成フォーム |
| POST | `/manage/events` | `manage.events.store` | 下書き作成 |
| GET | `/manage/events/{event:slug}` | `manage.events.show` | 主催者ダッシュボード |
| GET | `/manage/events/{event:slug}/edit` | `manage.events.edit` | 基本情報編集 |
| PATCH | `/manage/events/{event:slug}` | `manage.events.update` | 基本情報更新 |
| POST | `/manage/events/{event:slug}/publish` | `manage.events.publish` | 公開 |
| POST | `/manage/events/{event:slug}/close` | `manage.events.close` | 募集終了 |
| POST | `/manage/events/{event:slug}/complete` | `manage.events.complete` | 開催終了 |
| POST | `/manage/events/{event:slug}/cancel` | `manage.events.cancel` | 開催中止 |
| DELETE | `/manage/events/{event:slug}` | `manage.events.destroy` | 下書きのみ削除 |

### 共同運営者

| Method | URL | Route name | 用途 |
| --- | --- | --- | --- |
| GET | `/manage/events/{event:slug}/staff` | `manage.events.staff.index` | 運営者一覧 |
| POST | `/manage/events/{event:slug}/staff` | `manage.events.staff.store` | 運営者追加 |
| DELETE | `/manage/events/{event:slug}/staff/{user}` | `manage.events.staff.destroy` | 運営者解除 |
| POST | `/manage/events/{event:slug}/transfer-owner` | `manage.events.owner.transfer` | 主催者移譲 |

共同運営者の追加・解除と主催者移譲はownerだけが実行できる。

### 課題曲・パート枠

| Method | URL | Route name | 用途 |
| --- | --- | --- | --- |
| GET | `/manage/events/{event:slug}/songs` | `manage.events.songs.index` | 課題曲一覧 |
| POST | `/manage/events/{event:slug}/songs` | `manage.events.songs.store` | 課題曲追加 |
| PATCH | `/manage/events/{event:slug}/songs/{song}` | `manage.events.songs.update` | 課題曲更新 |
| DELETE | `/manage/events/{event:slug}/songs/{song}` | `manage.events.songs.destroy` | 下書き曲削除・公開曲非表示 |
| POST | `/manage/events/{event:slug}/songs/{song}/slots` | `manage.events.songs.slots.store` | パート枠追加 |
| PATCH | `/manage/events/{event:slug}/slots/{slot}` | `manage.events.slots.update` | パート枠更新・募集停止 |
| DELETE | `/manage/events/{event:slug}/slots/{slot}` | `manage.events.slots.destroy` | 未応募の枠を削除 |
| PUT | `/manage/events/{event:slug}/setlist` | `manage.events.setlist.update` | 曲順一括更新 |

ルートの`event`、`song`、`slot`の所属関係はscoped bindingまたは明示的検証で保証する。

### 参加申込・編成

| Method | URL | Route name | 用途 |
| --- | --- | --- | --- |
| GET | `/manage/events/{event:slug}/participations` | `manage.events.participations.index` | 参加申込一覧 |
| POST | `/manage/events/{event:slug}/participations/{participation}/approve` | `manage.events.participations.approve` | 参加承認 |
| POST | `/manage/events/{event:slug}/participations/{participation}/reject` | `manage.events.participations.reject` | 参加見送り |
| GET | `/manage/events/{event:slug}/lineup` | `manage.events.lineup.show` | 曲別編成表 |
| POST | `/manage/events/{event:slug}/entries/{entry}/hold` | `manage.events.entries.hold` | 応募保留 |
| POST | `/manage/events/{event:slug}/entries/{entry}/reject` | `manage.events.entries.reject` | 応募見送り |
| POST | `/manage/events/{event:slug}/entries/{entry}/assign` | `manage.events.entries.assign` | 担当確定 |
| DELETE | `/manage/events/{event:slug}/assignments/{assignment}` | `manage.events.assignments.destroy` | 担当解除 |

担当確定・解除は常にActionクラスを経由し、トランザクション内で行う。

参加キャンセルまたは担当解除で枠に不足が生じた場合、Eventが募集中かつ応募期限内ならActionが枠を自動的に再募集へ戻す。この処理は独立した公開ルートを持たない。期限外・募集終了・開催中止では自動再開しない。

### 演奏資料・お知らせ

| Method | URL | Route name | 用途 |
| --- | --- | --- | --- |
| POST | `/manage/events/{event:slug}/songs/{song}/resources` | `manage.events.songs.resources.store` | 資料URL追加 |
| PATCH | `/manage/events/{event:slug}/resources/{resource}` | `manage.events.resources.update` | 資料更新 |
| DELETE | `/manage/events/{event:slug}/resources/{resource}` | `manage.events.resources.destroy` | 資料削除 |
| GET | `/manage/events/{event:slug}/announcements` | `manage.events.announcements.index` | お知らせ一覧 |
| POST | `/manage/events/{event:slug}/announcements` | `manage.events.announcements.store` | 下書き作成 |
| PATCH | `/manage/events/{event:slug}/announcements/{announcement}` | `manage.events.announcements.update` | 下書き更新 |
| POST | `/manage/events/{event:slug}/announcements/{announcement}/publish` | `manage.events.announcements.publish` | 公開・通知 |
| DELETE | `/manage/events/{event:slug}/announcements/{announcement}` | `manage.events.announcements.destroy` | 下書き削除 |

## コントローラー

コントローラーは、入力受領、認可、Action呼び出し、Inertiaレスポンスまたはリダイレクトだけを担当する。

主なコントローラー：

- `Events\EventController`：公開一覧・詳細
- `Events\ParticipationController`：本人の参加申込・キャンセル
- `Events\PartEntryController`：本人の曲・パート応募
- `Manage\EventController`：主催イベントCRUD
- `Manage\EventStateController`：公開、募集終了、開催終了、中止
- `Manage\EventStaffController`：共同運営者管理
- `Manage\EventSongController`：課題曲管理
- `Manage\SongPartSlotController`：募集パート管理
- `Manage\ParticipationDecisionController`：参加承認・見送り
- `Manage\LineupController`：編成表表示
- `Manage\EntryDecisionController`：保留、見送り、担当確定
- `Manage\AssignmentController`：担当解除
- `Manage\SongResourceController`：演奏資料管理
- `Manage\AnnouncementController`：お知らせ管理

## Form Request

更新系エンドポイントごとにForm Requestを用意し、`authorize()`でもPolicyを利用する。

| Request | 主な検証 |
| --- | --- |
| `StoreEventRequest` | 日時、会場、定員、期限、上限値 |
| `UpdateEventRequest` | 状態に応じた変更可能項目 |
| `StoreParticipationRequest` | 参加種別、楽器、自己紹介 |
| `StorePartEntryRequest` | 枠、希望順位、応募期限、上限 |
| `UpdatePartEntryRequest` | 本人所有、未確定、順位重複 |
| `UpdateEntryPrioritiesRequest` | 本人の有効応募一式、順位の連続性・重複禁止 |
| `StoreEventSongRequest` | 曲名、キー、演奏時間 |
| `StoreSongPartSlotRequest` | 楽器、枠名、必要人数 |
| `ReviewParticipationRequest` | 状態遷移、任意メッセージ |
| `ReviewEntryRequest` | 状態遷移、任意メッセージ |
| `StoreSongResourceRequest` | URL、資料種別、タイトル |
| `StoreAnnouncementRequest` | タイトル、本文 |
| `UpdateSetlistRequest` | 同一イベントの曲ID、順番の重複禁止 |

Form Requestは形式検証を担当し、同時実行を考慮した最終的な整合性検証はAction内でも再実行する。

## Actionクラス

1つの業務操作を1クラスで表す。

| Action | 責務 |
| --- | --- |
| `CreateEvent` | ownerを設定して下書きを作成 |
| `PublishEvent` | 必須項目・課題曲・期限を検証して公開 |
| `ChangeEventState` | 募集終了、開催終了の遷移 |
| `CancelEvent` | 中止処理と全参加者への通知 |
| `TransferEventOwnership` | owner移譲とstaff関係の整理 |
| `SubmitParticipation` | 重複・期限・定員を検証して申込 |
| `ReviewParticipation` | Eventをロックし、承認済み参加者数と定員を再確認して承認または見送り |
| `SubmitPartEntry` | performer、承認状態、Event状態、曲公開、枠受付、期限、異なる応募曲数上限、順位を検証 |
| `UpdatePartEntryPriorities` | Participationをロックし、希望順位を二段階で一括更新 |
| `ReviewPartEntry` | 保留または見送りと通知 |
| `ConfirmAssignment` | 枠と異なる担当曲数上限をロック下で検証し、新しいAssignment履歴を作成 |
| `ReleaseAssignment` | 担当履歴を解除し、条件を満たす場合は枠を再募集へ戻して通知 |
| `CancelParticipation` | 参加・応募・担当をまとめて取消し、条件を満たす枠を再募集へ戻す |
| `UpdateSetlist` | 曲順を一括検証・更新 |
| `PublishAnnouncement` | 公開日時設定と対象者への通知 |

Actionの公開メソッドは原則`handle(...)`に統一し、Eloquent Modelまたは結果オブジェクトを返す。

## Enum

少なくとも以下を`app/Enums`へ追加する。

- `EventStatus`
- `ParticipationStatus`
- `ParticipationType`
- `PartEntryStatus`
- `ExperienceLevel`
- `SongResourceType`

Enumには表示名を返す`label(): string`を持たせ、画面側で英語の保存値を直接表示しない。

## Policy

### EventPolicy

- `viewAny`：全員
- `view`：公開イベント、またはowner・staff・承認済み参加者
- `create`：認証・メール確認済みユーザー
- `update`：ownerまたはstaff
- `delete`：ownerかつ下書き
- `manageStaff`：ownerのみ
- `publish`：ownerまたはstaff
- `cancel`：ownerのみ

### EventParticipationPolicy

- `create`：公開中、期限内、未申込の本人
- `view`：本人、または対象イベントのowner・staff
- `review`：対象イベントのowner・staff
- `cancel`：本人かつ未キャンセル

### PartEntryPolicy

- `create`：承認済みのperformer本人で、Eventが募集中、曲が公開中、枠が受付中、応募期限内
- `update` / `delete`：本人かつ未確定
- `review`：対象イベントのowner・staff

### AssignmentPolicy

- `create` / `delete`：対象イベントのowner・staff

EventSong、SongPartSlot、SongResource、Announcementは、親Eventの運営権限を基準に認可する。

## Inertia Props

ページへ渡すデータは必要な項目に限定し、Eloquent Model全体を無条件にシリアライズしない。

共通Props：

- `auth.user`
- `flash.success`
- `flash.status`
- `flash.error`

イベント詳細では、公開情報、曲、パート枠、集計済み状態だけを返し、応募者の個人情報は返さない。主催者の編成表では応募者プロフィールを返せるが、メールアドレスなど認証情報は除外する。

一覧はLaravel paginator形式を使用し、フィルター値を`filters`として同時に返す。

## 通知方針

MVPではLaravelのDatabase Notificationとメール通知を使用する。

| 契機 | 宛先 | Web内 | メール |
| --- | --- | --- | --- |
| 参加承認・見送り | 申込者 | 必須 | 必須 |
| 担当確定・解除 | 応募者 | 必須 | 必須 |
| 参加キャンセル | owner・staff | 必須 | 必須 |
| イベント中止 | `pending`または`approved`の未キャンセル申込者 | 必須 | 必須 |
| 日時・会場・参加費の変更 | `approved`の参加者 | 必須 | 必須 |
| お知らせ公開 | `approved`の参加者 | 必須 | 任意設定 |
| 再募集発生 | owner・staff | 必須 | 必須 |

`approved`は現在状態を指すため、キャンセル済み・見送り済み参加者を含まない。メールとDatabase NotificationのJobは`afterCommit()`相当を使い、業務トランザクションのコミット後にだけQueueへ投入する。ロールバック時は通知を送信しない。

## エラー処理

- 入力エラーは422相当としてInertiaのフォームエラーへ返す。
- 認証エラーはログイン画面へ、認可エラーは403へ返す。
- 存在しない、または親Eventに属さない子リソースは404として扱う。
- 同時更新で枠が埋まった場合は、フォームエラーとして「直前に担当が確定しました」と返す。
- 状態遷移不可の場合は、現在状態を示すメッセージとともに409相当の扱いにする。
- 例外メッセージへ個人情報やSQLを含めない。

## セキュリティ

- すべての更新ルートでCSRF保護を有効にする。
- 参加申込、応募、公開操作には適切なレート制限を設定する。
- 外部URLは`http`と`https`だけを許可する。
- 自由記述は表示時にエスケープし、任意HTMLを許可しない。
- 一覧検索のsort値は許可リストから選択し、入力値をSQLへ直接渡さない。
- メールアドレスなどの非公開情報をInertia Propsへ含めない。

## バックエンド実装順

1. Enum、Model、Migration、Factory、Seeder
2. Eventの公開一覧・詳細と主催CRUD
3. Policyと共同運営者管理
4. 課題曲、パート枠、演奏資料
5. 参加申込と承認
6. 曲・パート応募
7. 編成表、担当確定・解除
8. キャンセル処理
9. セットリスト、お知らせ、通知
10. 結合テストと権限テスト

## 必須テスト観点

- 別イベントの子リソースを操作できない。
- staffは許可された運営操作ができるが、owner移譲・中止はできない。
- 未承認参加者、見学者、募集終了イベント、非公開曲、募集停止枠はPartEntryを作成できない。
- 応募期限、異なる応募曲数上限、異なる担当曲数上限を超えられない。
- 同じ曲の複数パートは応募曲数・担当曲数で1曲と数える。
- 同時に参加承認してもparticipant_capacityを超えず、演奏参加者と見学者の両方を数える。
- 取消・見送り後は順位と同じ枠を再利用でき、順位交換を一括更新できる。
- 同時に担当確定しても必要人数を超えない。
- 担当解除後に再確定すると新しいAssignment履歴が作られ、過去履歴も残る。
- キャンセル後に有効な応募・担当が残らない。
- 公開イベントの応募者情報が一般閲覧者へ漏れない。
- 重要項目変更と状態変更の通知がコミット後に送信される。
