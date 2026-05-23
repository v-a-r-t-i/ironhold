# ⚔ Ironhold

Medieval fantasy castle builder — manage dwellers, craft gear, and battle for glory.

**Live:** https://v-a-r-t-i.github.io/ironhold

## Supabase Setup

Run this SQL in your Supabase project to create the saves table:

```sql
CREATE TABLE saves (
  user_id    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  castle_data JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE saves ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own save"
  ON saves FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

## Version

Current: v1.0.0
