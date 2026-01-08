import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, password, fullName, universityName } = await req.json();

    // Validate required fields
    if (!email || !password || !fullName || !universityName) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: email, password, fullName, universityName' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate password strength
    if (password.length < 6) {
      return new Response(
        JSON.stringify({ error: 'Password must be at least 6 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate names
    if (fullName.length < 2 || universityName.length < 2) {
      return new Response(
        JSON.stringify({ error: 'Full name and university name must be at least 2 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create admin Supabase client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Generate unique university code
    const code = `${universityName.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'X')}${Date.now().toString(36).toUpperCase().slice(-5)}`;

    // Create the user first
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm for admin accounts
      user_metadata: {
        full_name: fullName,
      },
    });

    if (userError) {
      console.error('Error creating user:', userError);
      return new Response(
        JSON.stringify({ error: userError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = userData.user.id;

    // Create the university code with admin_user_id set
    const { data: universityData, error: universityError } = await supabaseAdmin
      .from('university_codes')
      .insert({
        code,
        university_name: universityName,
        admin_user_id: userId,
        is_active: true,
        current_uses: 0,
      })
      .select()
      .single();

    if (universityError) {
      console.error('Error creating university:', universityError);
      // Clean up: delete the user if university creation fails
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return new Response(
        JSON.stringify({ error: 'Failed to create university. Please try again.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Note: The handle_new_user trigger creates the profile and assigns 'student' role
    // We need to update the profile with university_id and change the role to admin

    // Update the profile with university_id
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ university_id: universityData.id })
      .eq('user_id', userId);

    if (profileError) {
      console.error('Error updating profile:', profileError);
      // Non-critical, continue
    }

    // Update the user_role to 'admin' (the trigger created it as 'student')
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .update({ role: 'admin' })
      .eq('user_id', userId);

    if (roleError) {
      console.error('Error updating role:', roleError);
      // Clean up if role assignment fails
      await supabaseAdmin.from('university_codes').delete().eq('id', universityData.id);
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return new Response(
        JSON.stringify({ error: 'Failed to assign admin role. Please try again.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Admin account created successfully: ${email} for university: ${universityName}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Admin account created successfully',
        universityCode: code,
        user: {
          id: userId,
          email: userData.user.email,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
