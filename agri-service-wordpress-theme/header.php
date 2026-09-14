<!doctype html>
<html <?php language_attributes(); ?>>
<head>
<meta charset="<?php bloginfo('charset'); ?>">
<meta name="viewport" content="width=device-width,initial-scale=1">
<?php wp_head(); ?>
</head>
<body <?php body_class(); ?>>
<?php wp_body_open(); ?>
<div class="topbar"><div class="container"><span>Professional agricultural equipment & service</span><span><strong><?php echo esc_html(get_theme_mod('terrapro_phone','+31 6 1234 5678')); ?></strong> · <?php echo esc_html(get_theme_mod('terrapro_email','info@example.nl')); ?></span></div></div>
<header class="site-header">
  <div class="container nav">
    <a class="brand" href="<?php echo esc_url(home_url('/')); ?>" aria-label="Home">
      <span class="brand-mark" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 20c8 0 14-6 14-14C11 6 5 12 5 20Z"/><path d="M5 20c2-5 6-9 11-11"/></svg></span>
      <span><?php bloginfo('name'); ?></span>
    </a>
    <button class="menu-toggle" aria-label="Toggle navigation" aria-expanded="false">☰</button>
    <nav class="menu" aria-label="Primary navigation">
      <?php if(has_nav_menu('primary')){ wp_nav_menu(array('theme_location'=>'primary','container'=>false,'items_wrap'=>'%3$s','fallback_cb'=>false)); } else { ?>
        <a href="#services">Services</a><a href="#why-us">Why us</a><a href="#process">How we work</a><a href="#contact">Contact</a>
      <?php } ?>
    </nav>
    <div class="nav-actions"><a class="btn btn-light" href="tel:<?php echo esc_attr(preg_replace('/\s+/','',get_theme_mod('terrapro_phone','+31612345678'))); ?>">Call us</a><a class="btn btn-primary" href="#contact"><?php echo esc_html(get_theme_mod('terrapro_cta','Request a quote')); ?></a></div>
  </div>
</header>