// spclient.js
const supabaseUrl = 'https://eknvswnbraaxwzyedsnh.supabase.co';
const supabaseKey = 'sb_publishable_qeFlM57yOnCb4mZ7NJs3Fw_Ajc291kZ';

// On attache le client à l'objet 'window' pour pouvoir l'utiliser dans vos autres fichiers JS
// Si la bibliothèque Supabase n'a pas pu être chargée (pas d'Internet, bloqueur…),
// le client vaut null et le site fonctionne en mode local.
window.supabaseClient = window.supabase ? window.supabase.createClient(supabaseUrl, supabaseKey) : null;