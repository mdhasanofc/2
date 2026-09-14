<?php
/** TerraPro Agri theme setup */
function terrapro_agri_setup(){
  add_theme_support('title-tag');
  add_theme_support('post-thumbnails');
  add_theme_support('custom-logo');
  add_theme_support('html5', array('search-form','comment-form','comment-list','gallery','caption','style','script'));
  register_nav_menus(array('primary' => __('Primary Menu','terrapro-agri')));
}
add_action('after_setup_theme','terrapro_agri_setup');

function terrapro_agri_assets(){
  wp_enqueue_style('terrapro-fonts','https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Manrope:wght@600;700;800&display=swap',array(),null);
  wp_enqueue_style('terrapro-style',get_stylesheet_uri(),array(),wp_get_theme()->get('Version'));
  wp_enqueue_script('terrapro-script',get_template_directory_uri().'/assets/js/site.js',array(),wp_get_theme()->get('Version'),true);
}
add_action('wp_enqueue_scripts','terrapro_agri_assets');

function terrapro_agri_customize($wp_customize){
  $wp_customize->add_section('terrapro_business',array('title'=>__('Business Details','terrapro-agri'),'priority'=>30));
  foreach(array(
    'terrapro_phone'=>array('Phone','+31 6 1234 5678'),
    'terrapro_email'=>array('Email','info@example.nl'),
    'terrapro_location'=>array('Location','Netherlands'),
    'terrapro_cta'=>array('CTA Label','Request a quote')
  ) as $key=>$data){
    $wp_customize->add_setting($key,array('default'=>$data[1],'sanitize_callback'=>'sanitize_text_field'));
    $wp_customize->add_control($key,array('label'=>__($data[0],'terrapro-agri'),'section'=>'terrapro_business','type'=>'text'));
  }
}
add_action('customize_register','terrapro_agri_customize');
?>