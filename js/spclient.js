// spclient.js
const supabaseUrl = 'https://eknvswnbraaxwzyedsnh.supabase.co';
const supabaseKey = 'sb_publishable_qeFlM57yOnCb4mZ7NJs3Fw_Ajc291kZ';

// On attache le client à l'objet 'window' pour pouvoir l'utiliser dans vos autres fichiers JS
window.supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);