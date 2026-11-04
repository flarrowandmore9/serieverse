/*
# Let the admin update and delete episodes

1. Problem
- Saving an episode edit in the admin panel or calendar reported no error but changed nothing.
- The episodes table had no UPDATE or DELETE policy for the admin, so Postgres silently matched zero rows.

2. Changes
- Episodes: admins can update and delete any episode. Both policies check is_admin().
- Episodes: new episodes are still created only through the admin_add_episode function, which checks is_admin().

3. Security
- anon and authenticated lose INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES and TRIGGER grants on episodes that were never needed.
- anon and authenticated keep SELECT (public read).
- authenticated gets UPDATE and DELETE, but only the admin policies let those statements touch rows.
- service_role grants are unchanged because the catalog sync function uses them.

4. Notes
- Idempotent: policies are dropped before they are created, and REVOKE/GRANT can run again safely.
*/

REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON episodes FROM anon, authenticated;
GRANT SELECT ON episodes TO anon, authenticated;
GRANT UPDATE, DELETE ON episodes TO authenticated;

DROP POLICY IF EXISTS "admin_update_episodes" ON episodes;
CREATE POLICY "admin_update_episodes" ON episodes FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "admin_delete_episodes" ON episodes;
CREATE POLICY "admin_delete_episodes" ON episodes FOR DELETE
  TO authenticated
  USING (is_admin());
