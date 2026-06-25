-- Backfill profiles for existing auth users
INSERT INTO public.profiles (id, nome, email)
SELECT u.id, COALESCE(u.raw_user_meta_data->>'nome', u.email), u.email
FROM auth.users u
ON CONFLICT (id) DO NOTHING;

-- Ensure trigger exists so future signups get a profile row
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();