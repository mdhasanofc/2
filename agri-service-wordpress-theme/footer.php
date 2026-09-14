<footer class="site-footer">
  <div class="container">
    <div class="footer-grid">
      <div><div class="brand" style="color:#fff"><span class="brand-mark">T</span><span><?php bloginfo('name'); ?></span></div><p style="max-width:380px">Professional agricultural solutions, service and support with clear communication and dependable follow-through.</p></div>
      <div><h4>Solutions</h4><a href="#services">Machinery</a><a href="#services">Field & crop</a><a href="#services">Land & grounds</a><a href="#services">Parts & service</a></div>
      <div><h4>Company</h4><a href="#why-us">Why us</a><a href="#process">How we work</a><a href="#contact">Contact</a></div>
      <div><h4>Contact</h4><a href="tel:<?php echo esc_attr(preg_replace('/\s+/','',get_theme_mod('terrapro_phone','+31612345678'))); ?>"><?php echo esc_html(get_theme_mod('terrapro_phone','+31 6 1234 5678')); ?></a><a href="mailto:<?php echo esc_attr(get_theme_mod('terrapro_email','info@example.nl')); ?>"><?php echo esc_html(get_theme_mod('terrapro_email','info@example.nl')); ?></a><span><?php echo esc_html(get_theme_mod('terrapro_location','Netherlands')); ?></span></div>
    </div>
    <div class="footer-bottom"><span>© <?php echo date('Y'); ?> <?php bloginfo('name'); ?>. All rights reserved.</span><span>Privacy · Cookies · Terms</span></div>
  </div>
</footer>
<?php wp_footer(); ?>
</body></html>