# 物理データベース設計

## 方針

- DBMSは既存構成に合わせてMySQLを使用する。
- Laravel標準の`users`を認証主体として利用する。
- Laravelのログインセッション用に`sessions`が存在するため、音楽セッションは`events`と命名する。
- 状態値はDB固有のENUMではなく文字列で保存し、PHP Enumとバリデーションで制約する。
- 日時はUTCで保存し、画面表示時にイベントのタイムゾーンへ変換する。
- 金額は整数の最小通貨単位で保存する。日本円なら`fee_amount = 3000`とする。
- 公開後のイベントは原則として物理削除せず、状態変更で管理する。

## MVPで確定した運用ルール

| 項目 | MVPの仕様 |
| --- | --- |
| 参加方式 | 運営者による承認制 |
| 応募曲数上限 | イベントごとに設定。`NULL`は無制限 |
| 担当曲数上限 | イベントごとに設定。`NULL`は無制限 |
| 希望順位 | 参加者ごと、イベント全体で重複不可 |
| 見送り理由 | 任意の参加者向けメッセージ |
| 参加キャンセル | 即時確定し、応募取消・担当解除を同一トランザクションで行う |
| 演奏資料 | 外部URLのみ |

## テーブル関連図

```mermaid
erDiagram
    users ||--o| profiles : has
    users ||--o{ profile_instruments : plays
    instruments ||--o{ profile_instruments : classifies
    users ||--o{ events : owns
    users ||--o{ event_staff : assists
    events ||--o{ event_staff : has
    events ||--o{ event_genre : tagged
    genres ||--o{ event_genre : classifies
    users ||--o{ event_participations : applies
    events ||--o{ event_participations : receives
    event_participations ||--o{ participation_instruments : declares
    instruments ||--o{ participation_instruments : classifies
    events ||--o{ event_songs : contains
    event_songs ||--o{ song_part_slots : recruits
    instruments ||--o{ song_part_slots : classifies
    event_songs ||--o{ song_resources : provides
    event_participations ||--o{ part_entries : submits
    song_part_slots ||--o{ part_entries : receives
    part_entries ||--o| assignments : selected_as
    events ||--o{ announcements : publishes
    users ||--o{ announcements : creates
```

## テーブル定義

全テーブルは特記がない限り`id BIGINT UNSIGNED`、`created_at`、`updated_at`を持つ。

### profiles

`users`と1対1の公開プロフィール。

| カラム | 型 | 制約・用途 |
| --- | --- | --- |
| user_id | BIGINT UNSIGNED | FK users、UNIQUE、CASCADE |
| bio | TEXT | NULL可 |
| region | VARCHAR(100) | NULL可 |
| experience_level | VARCHAR(20) | NULL可 |
| avatar_path | VARCHAR(255) | NULL可 |

`experience_level`は`beginner`、`intermediate`、`advanced`、`professional`を候補とする。

### instruments

検索と編成に使用する楽器・パートのマスター。

| カラム | 型 | 制約・用途 |
| --- | --- | --- |
| name | VARCHAR(100) | UNIQUE |
| slug | VARCHAR(100) | UNIQUE |
| sort_order | SMALLINT UNSIGNED | DEFAULT 0 |
| is_active | BOOLEAN | DEFAULT true |

### profile_instruments

| カラム | 型 | 制約・用途 |
| --- | --- | --- |
| user_id | BIGINT UNSIGNED | FK users、CASCADE |
| instrument_id | BIGINT UNSIGNED | FK instruments、RESTRICT |
| experience_years | SMALLINT UNSIGNED | NULL可 |
| level | VARCHAR(20) | NULL可 |
| note | VARCHAR(500) | NULL可 |

`UNIQUE(user_id, instrument_id)`を設定する。

### events

音楽セッション本体。

| カラム | 型 | 制約・用途 |
| --- | --- | --- |
| owner_id | BIGINT UNSIGNED | FK users、RESTRICT |
| title | VARCHAR(200) | 必須 |
| slug | VARCHAR(220) | UNIQUE、公開URL用 |
| description | TEXT | NULL可 |
| status | VARCHAR(20) | DEFAULT `draft`、INDEX |
| starts_at | DATETIME | 必須、INDEX |
| ends_at | DATETIME | 必須 |
| timezone | VARCHAR(50) | DEFAULT `Asia/Tokyo` |
| venue_name | VARCHAR(200) | 必須 |
| venue_address | VARCHAR(500) | NULL可 |
| region | VARCHAR(100) | INDEX |
| fee_amount | INT UNSIGNED | DEFAULT 0 |
| currency | CHAR(3) | DEFAULT `JPY` |
| capacity | SMALLINT UNSIGNED | NULL可 |
| level_description | VARCHAR(500) | NULL可 |
| participation_deadline | DATETIME | NULL可 |
| entry_deadline | DATETIME | NULL可 |
| max_entries_per_participant | SMALLINT UNSIGNED | NULL可 |
| max_assignments_per_participant | SMALLINT UNSIGNED | NULL可 |
| published_at | DATETIME | NULL可 |
| cancelled_at | DATETIME | NULL可 |

状態は`draft`、`published`、`closed`、`completed`、`cancelled`とする。

### event_staff

共同運営者。主催者は`events.owner_id`で表現し、このテーブルには含めない。`event_id`と`user_id`を持ち、`UNIQUE(event_id, user_id)`を設定する。

### genres / event_genre

`genres`は`name`、`slug`、`sort_order`、`is_active`を持つ。`event_genre`は`event_id`と`genre_id`を持ち、複合UNIQUEを設定する。イベントは複数ジャンルを選択できる。

### event_participations

イベントへの参加申込。プロフィールとは別に申込時点の回答を保持する。

| カラム | 型 | 制約・用途 |
| --- | --- | --- |
| event_id | BIGINT UNSIGNED | FK events、CASCADE |
| user_id | BIGINT UNSIGNED | FK users、RESTRICT |
| participation_type | VARCHAR(20) | `performer`または`observer` |
| status | VARCHAR(20) | DEFAULT `pending`、INDEX |
| experience_level | VARCHAR(20) | NULL可、申込時点の値 |
| introduction | TEXT | NULL可 |
| message_to_organizer | TEXT | NULL可 |
| decision_message | TEXT | NULL可、参加者にも表示 |
| decided_by | BIGINT UNSIGNED | FK users、NULL可、SET NULL |
| decided_at | DATETIME | NULL可 |
| cancelled_at | DATETIME | NULL可 |

`UNIQUE(event_id, user_id)`を設定する。状態は`pending`、`approved`、`rejected`、`cancelled`とする。

### participation_instruments

参加申込時点で申告した楽器を保持する。`participation_id`と`instrument_id`を持ち、複合UNIQUEを設定する。

### event_songs

| カラム | 型 | 制約・用途 |
| --- | --- | --- |
| event_id | BIGINT UNSIGNED | FK events、CASCADE |
| title | VARCHAR(200) | 必須 |
| artist_name | VARCHAR(200) | NULL可 |
| original_key | VARCHAR(20) | NULL可 |
| performance_key | VARCHAR(20) | NULL可 |
| duration_seconds | SMALLINT UNSIGNED | NULL可 |
| structure_note | TEXT | NULL可 |
| performance_note | TEXT | NULL可 |
| setlist_order | SMALLINT UNSIGNED | NULL可 |
| is_published | BOOLEAN | DEFAULT true |

`INDEX(event_id, setlist_order)`を設定する。公開済みイベントでは物理削除せず、非公開化する。

### song_part_slots

| カラム | 型 | 制約・用途 |
| --- | --- | --- |
| event_song_id | BIGINT UNSIGNED | FK event_songs、CASCADE |
| instrument_id | BIGINT UNSIGNED | FK instruments、RESTRICT |
| label | VARCHAR(100) | 例：ギター1、コーラス |
| required_count | SMALLINT UNSIGNED | DEFAULT 1 |
| is_required | BOOLEAN | DEFAULT true |
| is_open | BOOLEAN | DEFAULT true |
| note | VARCHAR(500) | NULL可 |
| was_filled | BOOLEAN | DEFAULT false、再募集判定用 |

`UNIQUE(event_song_id, instrument_id, label)`を設定する。

### part_entries

| カラム | 型 | 制約・用途 |
| --- | --- | --- |
| participation_id | BIGINT UNSIGNED | FK event_participations、CASCADE |
| song_part_slot_id | BIGINT UNSIGNED | FK song_part_slots、CASCADE |
| priority | SMALLINT UNSIGNED | 1以上 |
| status | VARCHAR(20) | DEFAULT `applied`、INDEX |
| requested_key | VARCHAR(20) | NULL可 |
| can_chorus | BOOLEAN | DEFAULT false |
| can_switch_instrument | BOOLEAN | DEFAULT false |
| comment | TEXT | NULL可 |
| decision_message | TEXT | NULL可 |
| decided_by | BIGINT UNSIGNED | FK users、NULL可、SET NULL |
| decided_at | DATETIME | NULL可 |
| cancelled_at | DATETIME | NULL可 |

以下のUNIQUE制約を設定する。

- `UNIQUE(participation_id, song_part_slot_id)`：同じ枠への重複応募防止
- `UNIQUE(participation_id, priority)`：イベント内での希望順位重複防止

状態は`applied`、`on_hold`、`selected`、`rejected`、`cancelled`とする。

### assignments

| カラム | 型 | 制約・用途 |
| --- | --- | --- |
| part_entry_id | BIGINT UNSIGNED | FK part_entries、RESTRICT、UNIQUE |
| confirmed_by | BIGINT UNSIGNED | FK users、RESTRICT |
| confirmed_at | DATETIME | 必須 |
| released_by | BIGINT UNSIGNED | FK users、NULL可、SET NULL |
| released_at | DATETIME | NULL可、NULLなら現在有効 |
| release_reason | VARCHAR(500) | NULL可 |

同一パート枠の有効なAssignment数が`required_count`を超えないことを、トランザクションと行ロックで保証する。

### song_resources

| カラム | 型 | 制約・用途 |
| --- | --- | --- |
| event_song_id | BIGINT UNSIGNED | FK event_songs、CASCADE |
| type | VARCHAR(20) | `reference_audio`、`sheet_music`、`chord_chart`、`other` |
| title | VARCHAR(200) | 必須 |
| url | VARCHAR(2048) | 必須 |
| sort_order | SMALLINT UNSIGNED | DEFAULT 0 |

### announcements

| カラム | 型 | 制約・用途 |
| --- | --- | --- |
| event_id | BIGINT UNSIGNED | FK events、CASCADE |
| created_by | BIGINT UNSIGNED | FK users、RESTRICT |
| title | VARCHAR(200) | 必須 |
| body | TEXT | 必須 |
| published_at | DATETIME | NULL可、INDEX |

`published_at`がNULLなら下書きとする。

## 重要な整合性ルール

DB制約だけで表現できない以下のルールは、Laravelのサービス層で検証する。

1. PartEntryのParticipationとPartSlotが同じEventに属すること。
2. `approved`のParticipationだけがPartEntryを作成できること。
3. イベントの応募期限と応募数上限を超えていないこと。
4. Assignment確定時に担当曲数上限を超えないこと。
5. Assignment確定数がPartSlotの必要人数を超えないこと。
6. ownerまたはevent_staffだけが承認・確定操作を行えること。
7. ownerを共同運営者として重複登録しないこと。
8. `ends_at`が`starts_at`より後であること。
9. 参加申込期限と曲応募期限が開催日時より後にならないこと。

## トランザクション境界

### 担当確定

1. PartSlotを`SELECT ... FOR UPDATE`相当でロックする。
2. 有効なAssignment数、参加者の担当曲数、参加状態を再確認する。
3. Assignmentを作成し、PartEntryを`selected`へ変更する。
4. 必要人数に達した場合はPartSlotの`was_filled`をtrueにする。

### 参加キャンセル

1. Participationを`cancelled`へ変更する。
2. 未確定のPartEntryを`cancelled`へ変更する。
3. 有効なAssignmentを解除し、対応するPartEntryも`cancelled`へ変更する。
4. 不足が生じたPartSlotを再募集対象として通知する。
5. 運営者へキャンセル通知を作成する。

## 推奨マイグレーション順

1. profiles、instruments、profile_instruments
2. events、event_staff、genres、event_genre
3. event_participations、participation_instruments
4. event_songs、song_part_slots、song_resources
5. part_entries、assignments
6. announcements

## 実装前に残る判断

- 公開URLのslugを主催者指定にするか、自動生成だけにするか
- 会場住所を自由入力だけにするか、将来の地図検索を考慮して緯度・経度も持つか
- 通知をメールだけにするか、Web内通知も同時に実装するか
- 管理画面で楽器・ジャンルマスターを編集可能にするか
