-- Remove the overly permissive policy that allows anyone to view all profiles
DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;

-- Create a new policy that restricts profile viewing to authenticated users only
CREATE POLICY "Authenticated users can view profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- Users can still view their own profile (keeping existing policy for self-access)
-- The existing policy "Users can view their own profile" remains intact