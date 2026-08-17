CREATE TABLE IF NOT EXISTS batch_subjects (
    batch_id UUID REFERENCES batches(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    teacher_id UUID,
    PRIMARY KEY (batch_id, subject_id)
);
