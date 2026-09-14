<?php
/**
 * Plugin Name: Hire A Wifey Booking Experience
 * Description: A premium multi-step “Build Your Wifey” booking request experience with dynamic pricing, stored enquiries, email notifications and analytics hooks.
 * Version: 1.0.0
 * Author: Mohammad Hasan
 * Requires at least: 6.2
 * Requires PHP: 8.0
 */

if (!defined('ABSPATH')) {
    exit;
}

final class HAW_Booking_Experience {
    const VERSION = '1.0.0';
    const OPTION_KEY = 'haw_booking_settings';
    const CPT = 'haw_request';

    public static function init(): void {
        add_action('init', [__CLASS__, 'register_request_post_type']);
        add_shortcode('hire_a_wifey_booking', [__CLASS__, 'render_shortcode']);
        add_action('wp_ajax_haw_submit_booking', [__CLASS__, 'submit_booking']);
        add_action('wp_ajax_nopriv_haw_submit_booking', [__CLASS__, 'submit_booking']);
        add_action('admin_menu', [__CLASS__, 'admin_menu']);
        add_action('admin_init', [__CLASS__, 'register_settings']);
        add_filter('manage_' . self::CPT . '_posts_columns', [__CLASS__, 'request_columns']);
        add_action('manage_' . self::CPT . '_posts_custom_column', [__CLASS__, 'request_column_content'], 10, 2);
    }

    public static function activate(): void {
        self::register_request_post_type();
        $page = get_page_by_path('book-a-wifey');
        if (!$page) {
            $page_id = wp_insert_post([
                'post_title' => 'Book a Wifey',
                'post_name' => 'book-a-wifey',
                'post_content' => '[hire_a_wifey_booking]',
                'post_status' => 'publish',
                'post_type' => 'page',
            ]);
            if (!is_wp_error($page_id)) {
                update_option('show_on_front', 'page');
                update_option('page_on_front', (int) $page_id);
            }
        } else {
            update_option('show_on_front', 'page');
            update_option('page_on_front', (int) $page->ID);
        }
        flush_rewrite_rules();
    }

    public static function defaults(): array {
        return [
            'prices' => ['2' => 129, '3' => 179, '4' => 219, '5' => 269],
            'task_lines' => implode("\n", [
                'cleaning|General Household Cleaning|✨',
                'laundry|Laundry|🧺',
                'ironing|Ironing|👚',
                'beds|Making Beds / Changing Linen|🛏️',
                'meal-prep|Meal Prep|🥕',
                'organisation|Home Organisation|🧺',
                'tidying|Tidying Up|🪄',
                'other|Other household help|＋',
            ]),
            'hero_eyebrow' => 'BUILD YOUR WIFEY',
            'hero_title' => 'A little help. A lot more time back.',
            'hero_copy' => 'Choose your Wifey Time, build your to-do list, and tell us what matters most. Your Wifey will work through your priorities during the time you choose.',
            'admin_email' => get_option('admin_email'),
        ];
    }

    public static function settings(): array {
        $saved = get_option(self::OPTION_KEY, []);
        return wp_parse_args(is_array($saved) ? $saved : [], self::defaults());
    }

    public static function parse_tasks(string $lines): array {
        $tasks = [];
        foreach (preg_split('/\R/', $lines) as $line) {
            $line = trim($line);
            if (!$line) continue;
            $parts = array_map('trim', explode('|', $line));
            if (count($parts) < 2) continue;
            $slug = sanitize_key($parts[0]);
            if (!$slug) continue;
            $tasks[$slug] = [
                'slug' => $slug,
                'label' => sanitize_text_field($parts[1]),
                'icon' => isset($parts[2]) ? sanitize_text_field($parts[2]) : '✓',
            ];
        }
        return $tasks;
    }

    public static function register_request_post_type(): void {
        register_post_type(self::CPT, [
            'labels' => [
                'name' => 'Wifey Requests',
                'singular_name' => 'Wifey Request',
                'menu_name' => 'Wifey Requests',
                'edit_item' => 'View Wifey Request',
                'search_items' => 'Search Wifey Requests',
            ],
            'public' => false,
            'show_ui' => true,
            'show_in_menu' => true,
            'menu_icon' => 'dashicons-heart',
            'supports' => ['title'],
            'capability_type' => 'post',
            'map_meta_cap' => true,
        ]);
    }

    public static function enqueue_assets(): void {
        wp_enqueue_style('haw-booking', plugin_dir_url(__FILE__) . 'assets/haw-booking.css', [], self::VERSION);
        wp_enqueue_script('haw-booking', plugin_dir_url(__FILE__) . 'assets/haw-booking.js', [], self::VERSION, true);
        $settings = self::settings();
        $tasks = self::parse_tasks((string) $settings['task_lines']);
        wp_localize_script('haw-booking', 'HAWBooking', [
            'ajaxUrl' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('haw_booking_submit'),
            'prices' => array_map('floatval', (array) $settings['prices']),
            'tasks' => array_values($tasks),
            'currency' => 'AUD',
            'currencySymbol' => '$',
        ]);
    }

    public static function render_shortcode(): string {
        self::enqueue_assets();
        $settings = self::settings();
        $prices = array_map('floatval', (array) $settings['prices']);
        $tasks = self::parse_tasks((string) $settings['task_lines']);
        ob_start(); ?>
        <div class="haw-app" id="haw-booking-app">
            <div class="haw-shell">
                <header class="haw-brandbar">
                    <a class="haw-brand" href="#" aria-label="Hire A Wifey home"><span class="haw-brand-mark" aria-hidden="true">W</span><span class="haw-brand-copy"><strong>HIRE A WIFEY</strong><small>We Take Care of Home.</small></span></a>
                    <div class="haw-trust"><span>✓ Fully insured</span><span>✓ Police checked</span></div>
                </header>
                <section class="haw-hero">
                    <div><span class="haw-kicker"><?php echo esc_html($settings['hero_eyebrow']); ?></span><h1><?php echo esc_html($settings['hero_title']); ?></h1><p><?php echo esc_html($settings['hero_copy']); ?></p></div>
                    <div class="haw-price-pill" aria-live="polite"><span>YOUR WIFEY TIME</span><strong id="haw-live-selection">Choose a time</strong><small id="haw-live-price">No payment today</small></div>
                </section>
                <div class="haw-progress-wrap" aria-label="Booking progress"><div class="haw-progress-top"><span id="haw-step-label">Step 1 of 8</span><span id="haw-step-percent">12%</span></div><div class="haw-progress"><span id="haw-progress-bar"></span></div></div>
                <main class="haw-card">
                    <form id="haw-booking-form" novalidate>
                        <input type="hidden" name="action" value="haw_submit_booking"><input type="hidden" name="nonce" value="<?php echo esc_attr(wp_create_nonce('haw_booking_submit')); ?>"><input type="hidden" name="wifey_time" id="haw-wifey-time" value=""><input type="hidden" name="priority" id="haw-priority" value=""><input type="text" class="haw-honeypot" name="website" value="" tabindex="-1" autocomplete="off" aria-hidden="true">
                        <section class="haw-step is-active" data-step="1">
                            <div class="haw-step-head"><span class="haw-mini-label">1 — WIFEY TIME</span><h2>How much Wifey time do you need?</h2><p>Pick the amount of time that feels right. Your price is based on time — not how many tasks you add.</p></div>
                            <div class="haw-time-grid" role="radiogroup" aria-label="Choose Wifey time">
                            <?php foreach ([2,3,4,5] as $hours): ?>
                                <button type="button" class="haw-time-card" data-hours="<?php echo esc_attr($hours); ?>" data-price="<?php echo esc_attr($prices[(string)$hours] ?? 0); ?>" role="radio" aria-checked="false"><span class="haw-time-badge"><?php echo $hours===3?'MOST POPULAR':($hours===4?'MORE DONE':'&nbsp;'); ?></span><strong><?php echo esc_html($hours); ?></strong><span class="haw-hours">HOUR WIFEY</span><span class="haw-card-price">$<?php echo esc_html(number_format((float)($prices[(string)$hours] ?? 0),0)); ?></span><small><?php echo $hours===2?'A quick reset':($hours===3?'A solid helping hand':($hours===4?'A bigger home reset':'Maximum time back')); ?></small><span class="haw-select-dot" aria-hidden="true"></span></button>
                            <?php endforeach; ?>
                            </div>
                            <div class="haw-note"><strong>Good to know:</strong> add as many tasks as you like next. Your Wifey works through your priorities during the time booked.</div>
                        </section>
                        <section class="haw-step" data-step="2">
                            <div class="haw-step-head"><span class="haw-mini-label">2 — YOUR TO-DO LIST</span><h2>Build Your Wifey To-Do List.</h2><p>Tap everything you’d love a hand with. Choose more than one — the price stays the same.</p></div>
                            <div class="haw-task-grid" id="haw-task-grid">
                            <?php foreach ($tasks as $task): ?><label class="haw-task-card"><input type="checkbox" name="tasks[]" value="<?php echo esc_attr($task['slug']); ?>"><span class="haw-task-check">✓</span><span class="haw-task-icon" aria-hidden="true"><?php echo esc_html($task['icon']); ?></span><strong><?php echo esc_html($task['label']); ?></strong><small><?php echo $task['slug']==='other'?'Tell us what would make home easier.':'Add to my Wifey list'; ?></small></label><?php endforeach; ?>
                            </div>
                            <div class="haw-other-wrap" id="haw-other-wrap" hidden><label for="haw-other-task">What else would you like help with?</label><textarea id="haw-other-task" name="other_task" rows="3" placeholder="e.g. unpack groceries, tidy the playroom, water indoor plants..."></textarea></div>
                            <div class="haw-list-summary" id="haw-list-summary"><strong>0 tasks selected</strong><span>You can change this anytime before submitting.</span></div>
                        </section>
                        <section class="haw-step" data-step="3"><div class="haw-step-head"><span class="haw-mini-label">3 — TOP PRIORITY</span><h2>If we only nail one thing, what matters most?</h2><p>Your #1 priority helps your Wifey know where to start.</p></div><div class="haw-priority-list" id="haw-priority-list"></div></section>
                        <section class="haw-step" data-step="4">
                            <div class="haw-step-head"><span class="haw-mini-label">4 — HOW OFTEN</span><h2>How often should we make life easier?</h2><p>Choose what works for your home. This is a request, so we’ll confirm ongoing availability with you.</p></div>
                            <div class="haw-choice-grid haw-choice-grid--2">
                            <?php $frequencies=['weekly'=>['Weekly','Your new favourite day of the week','↻'],'fortnightly'=>['Fortnightly','A reliable reset every two weeks','↺'],'every-4-weeks'=>['Every 4 Weeks','A monthly helping hand','◷'],'one-off'=>['One-Off','Just when you need an extra pair of hands','✦']]; foreach($frequencies as $value=>$data): ?><label class="haw-option-card"><input type="radio" name="frequency" value="<?php echo esc_attr($value); ?>"><span class="haw-option-icon"><?php echo esc_html($data[2]); ?></span><span><strong><?php echo esc_html($data[0]); ?></strong><small><?php echo esc_html($data[1]); ?></small></span><span class="haw-radio-dot"></span></label><?php endforeach; ?>
                            </div>
                        </section>
                        <section class="haw-step" data-step="5">
                            <div class="haw-step-head"><span class="haw-mini-label">5 — WHEN</span><h2>What day and time suits you best?</h2><p>Give us your first preference. We’ll confirm availability before anything is locked in.</p></div>
                            <div class="haw-field-group"><label>Preferred day</label><div class="haw-chip-row"><?php foreach(['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Flexible'] as $day): ?><label class="haw-chip"><input type="radio" name="preferred_day" value="<?php echo esc_attr($day); ?>"><span><?php echo esc_html($day); ?></span></label><?php endforeach; ?></div></div>
                            <div class="haw-field-group"><label>Preferred time</label><div class="haw-choice-grid haw-choice-grid--2"><?php foreach(['Morning (8am–11am)'=>'☀','Midday (11am–2pm)'=>'◐','Afternoon (2pm–5pm)'=>'◒','Flexible'=>'↔'] as $time=>$icon): ?><label class="haw-option-card haw-option-card--compact"><input type="radio" name="preferred_time" value="<?php echo esc_attr($time); ?>"><span class="haw-option-icon"><?php echo esc_html($icon); ?></span><span><strong><?php echo esc_html($time); ?></strong></span><span class="haw-radio-dot"></span></label><?php endforeach; ?></div></div>
                        </section>
                        <section class="haw-step" data-step="6">
                            <div class="haw-step-head"><span class="haw-mini-label">6 — YOUR HOME</span><h2>Tell us where your Wifey is heading.</h2><p>Just the essentials. We’ll keep typing to a minimum.</p></div>
                            <div class="haw-form-grid">
                                <label class="haw-field haw-field--full"><span>Your name *</span><input type="text" name="customer_name" autocomplete="name" placeholder="Full name"></label>
                                <label class="haw-field"><span>Mobile *</span><input type="tel" name="mobile" autocomplete="tel" placeholder="04XX XXX XXX"></label>
                                <label class="haw-field"><span>Email *</span><input type="email" name="email" autocomplete="email" placeholder="you@example.com"></label>
                                <label class="haw-field"><span>Suburb *</span><input type="text" name="suburb" autocomplete="address-level2" placeholder="Hervey Bay suburb"></label>
                                <label class="haw-field"><span>Street / address</span><input type="text" name="address" autocomplete="street-address" placeholder="We can confirm later"></label>
                                <label class="haw-field"><span>Bedrooms</span><select name="bedrooms"><option value="">Select</option><?php foreach(range(1,6) as $n): ?><option value="<?php echo $n; ?>"><?php echo $n; ?><?php echo $n===6?'+':''; ?></option><?php endforeach; ?></select></label>
                                <label class="haw-field"><span>Bathrooms</span><select name="bathrooms"><option value="">Select</option><?php foreach(range(1,5) as $n): ?><option value="<?php echo $n; ?>"><?php echo $n; ?><?php echo $n===5?'+':''; ?></option><?php endforeach; ?></select></label>
                                <label class="haw-field haw-field--full"><span>Anything else we should know?</span><textarea name="notes" rows="4" placeholder="Pets, access notes, parking, special surfaces, priorities, or anything that helps us prepare..."></textarea></label>
                            </div>
                        </section>
                        <section class="haw-step" data-step="7"><div class="haw-step-head"><span class="haw-mini-label">7 — REVIEW</span><h2>Your Wifey request, all in one place.</h2><p>Make sure everything looks right before you send it through.</p></div><div class="haw-review" id="haw-review"></div><div class="haw-review-total"><span><small>Wifey Time</small><strong id="haw-review-time">—</strong></span><span><small>Request price</small><strong id="haw-review-price">—</strong></span><em>No payment taken today</em></div></section>
                        <section class="haw-step" data-step="8"><div class="haw-submit-state"><div class="haw-spinner" aria-hidden="true"></div><span class="haw-mini-label">8 — SENDING REQUEST</span><h2>Sending your Wifey request…</h2><p>We’re safely saving your details now.</p></div></section>
                        <section class="haw-step" data-step="9"><div class="haw-success"><div class="haw-success-icon">♥</div><span class="haw-mini-label">REQUEST RECEIVED</span><h2>Your Wifey request is in! 💗</h2><p>Thanks — we’ve saved your request. A friendly Wifey will be in touch to confirm availability and the final booking details.</p><div class="haw-success-card"><span>Reference</span><strong id="haw-reference">—</strong><span>Requested</span><strong id="haw-success-summary">—</strong></div><p class="haw-success-note">No payment has been taken. This is a booking request only.</p><button type="button" class="haw-btn haw-btn--dark" id="haw-start-over">Start another request</button></div></section>
                        <div class="haw-error" id="haw-error" role="alert" hidden></div>
                        <footer class="haw-actions" id="haw-actions"><button type="button" class="haw-btn haw-btn--ghost" id="haw-back" hidden>← Back</button><button type="button" class="haw-btn haw-btn--pink" id="haw-next">Choose my Wifey time →</button></footer>
                    </form>
                </main>
                <div class="haw-footnote"><span>🔒 Your details are kept private.</span><span>Booking request only — no payment today.</span></div>
            </div>
        </div>
        <?php return (string) ob_get_clean();
    }

    public static function submit_booking(): void {
        $nonce = isset($_POST['nonce']) ? sanitize_text_field(wp_unslash($_POST['nonce'])) : '';
        if (!wp_verify_nonce($nonce, 'haw_booking_submit')) wp_send_json_error(['message'=>'Your session expired. Please refresh and try again.'],403);
        if (!empty($_POST['website'])) wp_send_json_error(['message'=>'Spam check failed.'],400);
        $ip = isset($_SERVER['REMOTE_ADDR']) ? sanitize_text_field(wp_unslash($_SERVER['REMOTE_ADDR'])) : 'unknown';
        $rate_key='haw_rate_'.md5($ip);
        if(get_transient($rate_key)) wp_send_json_error(['message'=>'Please wait a moment before sending another request.'],429);
        set_transient($rate_key,1,30);
        $settings=self::settings(); $tasks_config=self::parse_tasks((string)$settings['task_lines']); $prices=array_map('floatval',(array)$settings['prices']);
        $hours=isset($_POST['wifey_time'])?sanitize_text_field(wp_unslash($_POST['wifey_time'])):'';
        $selected_tasks=isset($_POST['tasks'])&&is_array($_POST['tasks'])?array_map('sanitize_key',wp_unslash($_POST['tasks'])):[]; $selected_tasks=array_values(array_intersect($selected_tasks,array_keys($tasks_config)));
        $priority=isset($_POST['priority'])?sanitize_key(wp_unslash($_POST['priority'])):'';
        $frequency=isset($_POST['frequency'])?sanitize_key(wp_unslash($_POST['frequency'])):'';
        $preferred_day=isset($_POST['preferred_day'])?sanitize_text_field(wp_unslash($_POST['preferred_day'])):'';
        $preferred_time=isset($_POST['preferred_time'])?sanitize_text_field(wp_unslash($_POST['preferred_time'])):'';
        $name=isset($_POST['customer_name'])?sanitize_text_field(wp_unslash($_POST['customer_name'])):'';
        $mobile=isset($_POST['mobile'])?sanitize_text_field(wp_unslash($_POST['mobile'])):'';
        $email=isset($_POST['email'])?sanitize_email(wp_unslash($_POST['email'])):'';
        $suburb=isset($_POST['suburb'])?sanitize_text_field(wp_unslash($_POST['suburb'])):'';
        $address=isset($_POST['address'])?sanitize_text_field(wp_unslash($_POST['address'])):'';
        $bedrooms=isset($_POST['bedrooms'])?absint($_POST['bedrooms']):0; $bathrooms=isset($_POST['bathrooms'])?absint($_POST['bathrooms']):0;
        $notes=isset($_POST['notes'])?sanitize_textarea_field(wp_unslash($_POST['notes'])):''; $other_task=isset($_POST['other_task'])?sanitize_textarea_field(wp_unslash($_POST['other_task'])):'';
        $allowed=['weekly','fortnightly','every-4-weeks','one-off'];
        if(!isset($prices[$hours])||!$selected_tasks||!in_array($priority,$selected_tasks,true)||!in_array($frequency,$allowed,true)||!$preferred_day||!$preferred_time||!$name||!$mobile||!is_email($email)||!$suburb) wp_send_json_error(['message'=>'Please check the highlighted steps and complete all required details.'],422);
        $price=(float)$prices[$hours]; $task_labels=[]; foreach($selected_tasks as $slug){if(isset($tasks_config[$slug]))$task_labels[]=$tasks_config[$slug]['label'];}
        $priority_label=isset($tasks_config[$priority])?$tasks_config[$priority]['label']:$priority; $frequency_labels=['weekly'=>'Weekly','fortnightly'=>'Fortnightly','every-4-weeks'=>'Every 4 Weeks','one-off'=>'One-Off'];
        $reference='WIFEY-'.gmdate('ymd').'-'.strtoupper(wp_generate_password(5,false,false));
        $post_id=wp_insert_post(['post_type'=>self::CPT,'post_status'=>'publish','post_title'=>$reference.' — '.$name],true); if(is_wp_error($post_id))wp_send_json_error(['message'=>'We could not save your request. Please try again.'],500);
        $meta=['reference'=>$reference,'hours'=>$hours,'price'=>$price,'tasks'=>$selected_tasks,'task_labels'=>$task_labels,'priority'=>$priority,'priority_label'=>$priority_label,'frequency'=>$frequency,'frequency_label'=>$frequency_labels[$frequency],'preferred_day'=>$preferred_day,'preferred_time'=>$preferred_time,'customer_name'=>$name,'mobile'=>$mobile,'email'=>$email,'suburb'=>$suburb,'address'=>$address,'bedrooms'=>$bedrooms,'bathrooms'=>$bathrooms,'notes'=>$notes,'other_task'=>$other_task,'status'=>'New request'];
        foreach($meta as $key=>$value)update_post_meta($post_id,'_haw_'.$key,$value);
        self::send_notifications($meta);
        wp_send_json_success(['message'=>'Request received.','reference'=>$reference,'summary'=>$hours.' Hour Wifey · '.$frequency_labels[$frequency],'price'=>$price]);
    }

    private static function send_notifications(array $data): void {
        $settings=self::settings(); $admin_email=is_email($settings['admin_email'])?$settings['admin_email']:get_option('admin_email'); $task_text=implode(', ',$data['task_labels']); if($data['other_task'])$task_text.=' — Other: '.$data['other_task'];
        $admin_subject='New Wifey Request: '.$data['reference'];
        $admin_body="New Hire A Wifey booking request\n\nReference: {$data['reference']}\nCustomer: {$data['customer_name']}\nMobile: {$data['mobile']}\nEmail: {$data['email']}\nSuburb: {$data['suburb']}\nAddress: {$data['address']}\n\nWifey Time: {$data['hours']} hours\nPrice: $".number_format((float)$data['price'],2)."\nTasks: {$task_text}\n#1 Priority: {$data['priority_label']}\nFrequency: {$data['frequency_label']}\nPreferred: {$data['preferred_day']} — {$data['preferred_time']}\nBedrooms: ".($data['bedrooms']?:'Not supplied')."\nBathrooms: ".($data['bathrooms']?:'Not supplied')."\n\nNotes: {$data['notes']}\n\nThis is a booking request only. No payment has been taken.";
        wp_mail($admin_email,$admin_subject,$admin_body,['Reply-To: '.$data['customer_name'].' <'.$data['email'].'>']);
        $customer_subject='We’ve got your Wifey request 💗';
        $customer_body="Hi {$data['customer_name']},\n\nThanks for building your Wifey request. We’ve saved it under {$data['reference']}.\n\n{$data['hours']} Hour Wifey — $".number_format((float)$data['price'],0)."\n{$data['frequency_label']} · {$data['preferred_day']} · {$data['preferred_time']}\nTop priority: {$data['priority_label']}\n\nA friendly Wifey will be in touch to confirm availability and final booking details. No payment has been taken.\n\nHire A Wifey\nWe Take Care of Home.";
        wp_mail($data['email'],$customer_subject,$customer_body);
    }

    public static function request_columns(array $columns): array {return ['cb'=>$columns['cb']??'<input type="checkbox" />','title'=>'Request','haw_time'=>'Wifey Time','haw_frequency'=>'Frequency','haw_phone'=>'Mobile','haw_suburb'=>'Suburb','date'=>'Received'];}
    public static function request_column_content(string $column,int $post_id): void {if($column==='haw_time'){echo esc_html(get_post_meta($post_id,'_haw_hours',true).' hours · $'.number_format((float)get_post_meta($post_id,'_haw_price',true),0));return;} $map=['haw_frequency'=>'_haw_frequency_label','haw_phone'=>'_haw_mobile','haw_suburb'=>'_haw_suburb']; if(isset($map[$column]))echo esc_html((string)get_post_meta($post_id,$map[$column],true));}
    public static function admin_menu(): void {add_options_page('Wifey Booking Settings','Wifey Booking','manage_options','haw-booking-settings',[__CLASS__,'settings_page']);}
    public static function register_settings(): void {register_setting('haw_booking_group',self::OPTION_KEY,['sanitize_callback'=>[__CLASS__,'sanitize_settings']]);}
    public static function sanitize_settings($input): array {$defaults=self::defaults();$out=$defaults;foreach([2,3,4,5] as $h){$raw=$input['prices'][(string)$h]??$defaults['prices'][(string)$h];$out['prices'][(string)$h]=max(0,(float)$raw);} $out['task_lines']=isset($input['task_lines'])?sanitize_textarea_field($input['task_lines']):$defaults['task_lines'];$out['hero_eyebrow']=isset($input['hero_eyebrow'])?sanitize_text_field($input['hero_eyebrow']):$defaults['hero_eyebrow'];$out['hero_title']=isset($input['hero_title'])?sanitize_text_field($input['hero_title']):$defaults['hero_title'];$out['hero_copy']=isset($input['hero_copy'])?sanitize_textarea_field($input['hero_copy']):$defaults['hero_copy'];$out['admin_email']=isset($input['admin_email'])&&is_email($input['admin_email'])?sanitize_email($input['admin_email']):get_option('admin_email');return $out;}
    public static function settings_page(): void {if(!current_user_can('manage_options'))return;$settings=self::settings(); ?>
        <div class="wrap"><h1>Hire A Wifey Booking Settings</h1><p>Change pricing, task labels and front-end wording without editing code.</p><form method="post" action="options.php"><?php settings_fields('haw_booking_group'); ?><table class="form-table" role="presentation"><tr><th scope="row">Wifey Time pricing</th><td><?php foreach([2,3,4,5] as $h): ?><label style="display:inline-block;margin-right:18px"><?php echo esc_html($h); ?> hours<br><input type="number" min="0" step="1" name="<?php echo esc_attr(self::OPTION_KEY); ?>[prices][<?php echo esc_attr($h); ?>]" value="<?php echo esc_attr($settings['prices'][(string)$h]); ?>"></label><?php endforeach; ?></td></tr><tr><th scope="row"><label for="haw-admin-email">Admin notification email</label></th><td><input class="regular-text" id="haw-admin-email" type="email" name="<?php echo esc_attr(self::OPTION_KEY); ?>[admin_email]" value="<?php echo esc_attr($settings['admin_email']); ?>"></td></tr><tr><th scope="row"><label for="haw-hero-eyebrow">Hero eyebrow</label></th><td><input class="regular-text" id="haw-hero-eyebrow" type="text" name="<?php echo esc_attr(self::OPTION_KEY); ?>[hero_eyebrow]" value="<?php echo esc_attr($settings['hero_eyebrow']); ?>"></td></tr><tr><th scope="row"><label for="haw-hero-title">Hero title</label></th><td><input class="large-text" id="haw-hero-title" type="text" name="<?php echo esc_attr(self::OPTION_KEY); ?>[hero_title]" value="<?php echo esc_attr($settings['hero_title']); ?>"></td></tr><tr><th scope="row"><label for="haw-hero-copy">Hero copy</label></th><td><textarea class="large-text" rows="3" id="haw-hero-copy" name="<?php echo esc_attr(self::OPTION_KEY); ?>[hero_copy]"><?php echo esc_textarea($settings['hero_copy']); ?></textarea></td></tr><tr><th scope="row"><label for="haw-task-lines">Tasks</label></th><td><textarea class="large-text code" rows="10" id="haw-task-lines" name="<?php echo esc_attr(self::OPTION_KEY); ?>[task_lines]"><?php echo esc_textarea($settings['task_lines']); ?></textarea><p class="description">One per line: <code>slug|Label|Icon</code>. Example: <code>laundry|Laundry|🧺</code></p></td></tr></table><?php submit_button(); ?></form></div>
    <?php }
}
register_activation_hook(__FILE__,['HAW_Booking_Experience','activate']);
HAW_Booking_Experience::init();
