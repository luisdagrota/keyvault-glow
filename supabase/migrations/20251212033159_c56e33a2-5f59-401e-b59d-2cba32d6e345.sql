-- Drop the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "Only admins can manage roles" ON public.user_roles;

-- Create a new policy that uses the has_role function (which is SECURITY DEFINER)
CREATE POLICY "Admins can manage all roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));