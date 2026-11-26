-- Usage rows for the national-statistics-site build session, its three
-- review sessions, the fix session and the parent session.
-- Query from bundle --help (step 1), model joined in. Run with the muse.db tool
-- AFTER the sessions have ended: Muse writes a message's usage row when the
-- message is delivered, and a session's row appears only once the session ends.
-- Build session id: 7174eb25-e8e9-446e-836b-24098e98c7d9
-- Review session ids: 5551f660-78d4-4b78-8116-141c83fd2e84, ee8d7e5b-877e-4cfd-bb08-eb5626a68dba, 474afc57-7fd3-40e6-819e-3a296452e225
-- Fix session id: bd7d4be0-3f79-407e-ba80-913efafc27d9
-- Parent session id: 950c7c4e-3f5d-4965-8ea4-d6c66c844869
SELECT u.agent_id AS agent_id, u.message_id AS message_id, u.created_at AS created_at, u.input_tokens AS input_tokens, u.output_tokens AS output_tokens, a.model AS model FROM agent.agent_message_token_usage u JOIN agent.agents a ON a.agent_id = u.agent_id WHERE u.agent_id IN ('7174eb25-e8e9-446e-836b-24098e98c7d9', '5551f660-78d4-4b78-8116-141c83fd2e84', 'ee8d7e5b-877e-4cfd-bb08-eb5626a68dba', '474afc57-7fd3-40e6-819e-3a296452e225', 'bd7d4be0-3f79-407e-ba80-913efafc27d9', '950c7c4e-3f5d-4965-8ea4-d6c66c844869') ORDER BY u.created_at DESC LIMIT 500
