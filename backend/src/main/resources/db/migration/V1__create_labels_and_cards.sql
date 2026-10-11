CREATE TABLE labels (
    id    bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name  varchar(50) NOT NULL,
    color varchar(7)  NOT NULL -- #RRGGBB 形式
);

CREATE TABLE cards (
    id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    title      varchar(100) NOT NULL,
    detail     text,
    due_date   date,
    priority   varchar(10) NOT NULL DEFAULT 'MEDIUM' CHECK (priority IN ('HIGH', 'MEDIUM', 'LOW')),
    status     varchar(20) NOT NULL DEFAULT 'TODO' CHECK (status IN ('TODO', 'IN_PROGRESS', 'DONE')),
    position   integer     NOT NULL,
    label_id   bigint REFERENCES labels (id) ON DELETE SET NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_cards_status_position ON cards (status, position);
