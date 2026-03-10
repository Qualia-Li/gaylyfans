import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  real,
  serial,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

export const userRoleEnum = pgEnum('user_role', ['user', 'admin'])

export const user = pgTable('user', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').unique().notNull(),
  emailVerified: boolean("email_verified").default(false).notNull(), // better-auth
  name: text("name"), // better-auth
  image: text("image"), // better-auth
  role: userRoleEnum('role').default('user').notNull(),
  isAnonymous: boolean('is_anonymous').default(false).notNull(),
  referral: text('referral'),
  stripeCustomerId: text("stripe_customer_id").unique(),
  banned: boolean('banned'),
  banReason: text('ban_reason'),
  banExpires: timestamp('ban_expires'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
})

export const session = pgTable("session", {
  id: uuid('id').primaryKey().defaultRandom(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: uuid("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at', { withTimezone: true }),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at', { withTimezone: true }),
  scope: text('scope'),
  password: text("password"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const verification = pgTable("verification", {
  id: uuid('id').primaryKey().defaultRandom(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

// User source/attribution tracking
export const userSource = pgTable(
  'user_source',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .references(() => user.id, { onDelete: 'cascade' })
      .notNull(),

    // aff code (from URL params like ref, via, aff.)
    affCode: text('aff_code'),

    // Traffic Source (UTM parameters)
    utmSource: text('utm_source'),
    utmMedium: text('utm_medium'),
    utmCampaign: text('utm_campaign'),
    utmTerm: text('utm_term'),
    utmContent: text('utm_content'),
    referrer: text('referrer'),
    referrerDomain: text('referrer_domain'),
    landingPage: text('landing_page'),

    // Device & Browser
    userAgent: text('user_agent'),
    browser: text('browser'),
    browserVersion: text('browser_version'),
    os: text('os'),
    osVersion: text('os_version'),
    deviceType: text('device_type'), // mobile, desktop, tablet
    deviceBrand: text('device_brand'),
    deviceModel: text('device_model'),
    screenWidth: integer('screen_width'),
    screenHeight: integer('screen_height'),
    language: text('language'),
    timezone: text('timezone'),

    // Network & Location (from Cloudflare headers)
    ipAddress: text('ip_address'),
    countryCode: varchar('country_code', { length: 2 }),

    // Extensibility
    metadata: jsonb('metadata'),

    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    userIdIdx: index('idx_user_source_user_id').on(table.userId),
    affCodeIdx: index('idx_user_source_aff_code').on(table.affCode),
    utmSourceIdx: index('idx_user_source_utm_source').on(table.utmSource),
    countryCodeIdx: index('idx_user_source_country_code').on(table.countryCode),
    createdAtIdx: index('idx_user_source_created_at').on(table.createdAt),
  })
)

export const pricingPlanEnvironmentEnum = pgEnum('pricing_plan_environment', [
  'test',
  'live',
])

export const providerEnum = pgEnum('provider', [
  'none', // no payment feature
  'stripe',
  'creem',
])
export type PaymentProvider = (typeof providerEnum.enumValues)[number]

export const paymentTypeEnum = pgEnum('payment_type', [
  'one_time', // stripe
  'onetime', // creem
  'recurring', // stripe and creem
])
export type PaymentType = (typeof paymentTypeEnum.enumValues)[number]

export const recurringIntervalEnum = pgEnum('recurring_interval', [
  'month', // stripe
  'year', // stripe
  'every-month', // creem recurring
  'every-year', // creem recurring
  'once', // creem onetime
])
export type RecurringInterval = (typeof recurringIntervalEnum.enumValues)[number]

// Pricing plan groups for organizing plans
// Using slug as primary key for simplicity and easier querying
export const pricingPlanGroups = pgTable('pricing_plan_groups', {
  slug: varchar('slug', { length: 100 }).primaryKey(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
})

export const pricingPlans = pgTable('pricing_plans', {
  id: uuid('id').primaryKey().defaultRandom(),
  environment: pricingPlanEnvironmentEnum('environment').notNull(),
  groupSlug: varchar('group_slug', { length: 100 })
    .references(() => pricingPlanGroups.slug, { onDelete: 'restrict' })
    .default('default')
    .notNull(),
  cardTitle: text('card_title').notNull(),
  cardDescription: text('card_description'),
  provider: providerEnum('provider').default('none'),
  stripePriceId: varchar('stripe_price_id', { length: 255 }),
  stripeProductId: varchar('stripe_product_id', { length: 255 }),
  stripeCouponId: varchar('stripe_coupon_id', { length: 255 }),
  creemProductId: varchar('creem_product_id', { length: 255 }),
  creemDiscountCode: varchar('creem_discount_code', { length: 255 }),
  enableManualInputCoupon: boolean('enable_manual_input_coupon')
    .default(false)
    .notNull(),
  // paymentType: varchar('payment_type', { length: 50 }),
  paymentType: paymentTypeEnum('payment_type'),
  // recurringInterval: varchar('recurring_interval', { length: 50 }),
  recurringInterval: recurringIntervalEnum('recurring_interval'),
  trialPeriodDays: integer('trial_period_days'),
  price: numeric('price'),
  currency: varchar('currency', { length: 10 }),
  displayPrice: varchar('display_price', { length: 50 }),
  originalPrice: varchar('original_price', { length: 50 }),
  priceSuffix: varchar('price_suffix', { length: 100 }),
  features: jsonb('features').default('[]').notNull(),
  isHighlighted: boolean('is_highlighted').default(false).notNull(),
  highlightText: text('highlight_text'),
  buttonText: text('button_text'),
  buttonLink: text('button_link'),
  displayOrder: integer('display_order').default(0).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  langJsonb: jsonb('lang_jsonb').default('{}').notNull(),
  benefitsJsonb: jsonb('benefits_jsonb').default('{}'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
})

export const orders = pgTable(
  'orders',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .references(() => user.id, { onDelete: 'cascade' })
      .notNull(),
    provider: text('provider').notNull(),
    providerOrderId: text('provider_order_id').notNull(),
    orderType: text('order_type').notNull(),
    status: text('status').notNull(),
    stripePaymentIntentId: text('stripe_payment_intent_id'),
    stripeInvoiceId: text('stripe_invoice_id'),
    stripeChargeId: text('stripe_charge_id'),
    subscriptionId: text('subscription_id'),
    planId: uuid('plan_id').references(() => pricingPlans.id, {
      onDelete: 'set null',
    }),
    productId: text('product_id'),
    priceId: varchar('price_id', { length: 255 }),
    amountSubtotal: numeric('amount_subtotal'),
    amountDiscount: numeric('amount_discount').default('0'),
    amountTax: numeric('amount_tax').default('0'),
    amountTotal: numeric('amount_total').notNull(),
    currency: varchar('currency', { length: 10 }).notNull(),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => {
    return {
      userIdx: index('idx_orders_user_id').on(table.userId),
      providerIdx: index('idx_orders_provider').on(table.provider),
      planIdIdx: index('idx_orders_plan_id').on(table.planId),
      providerProviderOrderIdUnique: unique(
        'idx_orders_provider_provider_order_id_unique'
      ).on(table.provider, table.providerOrderId),
    }
  }
)

export const subscriptions = pgTable(
  'subscriptions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .references(() => user.id, { onDelete: 'cascade' })
      .notNull(),
    planId: uuid('plan_id')
      .references(() => pricingPlans.id, { onDelete: 'restrict' })
      .notNull(),
    provider: providerEnum('provider').notNull(),
    subscriptionId: text('subscription_id').notNull().unique(),
    customerId: text('customer_id').notNull(),
    productId: text('product_id'),
    priceId: varchar('price_id'),
    status: text('status').notNull(),
    currentPeriodStart: timestamp('current_period_start', {
      withTimezone: true,
    }),
    currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }),
    cancelAtPeriodEnd: boolean('cancel_at_period_end').default(false).notNull(),
    canceledAt: timestamp('canceled_at', { withTimezone: true }),
    endedAt: timestamp('ended_at', { withTimezone: true }),
    trialStart: timestamp('trial_start', { withTimezone: true }),
    trialEnd: timestamp('trial_end', { withTimezone: true }),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => {
    return {
      userIdx: index('idx_subscriptions_user_id').on(table.userId),
      subscriptionIdIdx: index('idx_subscriptions_subscription_id').on(table.subscriptionId),
      statusIdx: index('idx_subscriptions_status').on(table.status),
      planIdIdx: index('idx_subscriptions_plan_id').on(table.planId),
    }
  }
)

export const usage = pgTable('usage', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .references(() => user.id, { onDelete: 'cascade' })
    .notNull()
    .unique(),
  subscriptionCreditsBalance: integer('subscription_credits_balance')
    .default(0)
    .notNull(),
  oneTimeCreditsBalance: integer('one_time_credits_balance')
    .default(0)
    .notNull(),
  balanceJsonb: jsonb('balance_jsonb').default('{}').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
})

export const creditLogs = pgTable(
  'credit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .references(() => user.id, { onDelete: 'cascade' })
      .notNull(),
    amount: integer('amount').notNull(),
    oneTimeBalanceAfter: integer('one_time_balance_after').notNull(),
    subscriptionBalanceAfter: integer('subscription_balance_after').notNull(),
    type: text('type').notNull(),
    notes: text('notes'),
    relatedOrderId: uuid('related_order_id').references(() => orders.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => {
    return {
      userIdx: index('idx_credit_logs_user_id').on(table.userId),
      typeIdx: index('idx_credit_logs_type').on(table.type),
      relatedOrderIdIdx: index('idx_credit_logs_related_order_id').on(
        table.relatedOrderId
      ),
    }
  }
)

export const postTypeEnum = pgEnum('post_type', [
  'blog',
  'glossary',
])
export type PostType = (typeof postTypeEnum.enumValues)[number]

export const postStatusEnum = pgEnum('post_status', [
  'draft',
  'published',
  'archived',
])
export type PostStatus = (typeof postStatusEnum.enumValues)[number]

export const postVisibilityEnum = pgEnum('post_visibility', [
  'public',
  'logged_in',
  'subscribers',
])

export const posts = pgTable(
  'posts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    language: varchar('language', { length: 10 }).notNull(),
    postType: postTypeEnum('post_type').default('blog'),
    authorId: uuid('author_id')
      .references(() => user.id, { onDelete: 'set null' })
      .notNull(),
    title: text('title').notNull(),
    slug: text('slug').notNull(),
    content: text('content'),
    description: text('description'),
    featuredImageUrl: text('featured_image_url'),
    isPinned: boolean('is_pinned').default(false).notNull(),
    status: postStatusEnum('status').default('draft').notNull(),
    visibility: postVisibilityEnum('visibility').default('public').notNull(),
    publishedAt: timestamp('published_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => {
    return {
      languageSlugPostTypeUnique: unique('posts_language_slug_post_type_unique').on(
        table.language,
        table.slug,
        table.postType
      ),
      authorIdIdx: index('idx_posts_author_id').on(table.authorId),
      postTypeIdx: index('idx_posts_post_type').on(table.postType),
      statusIdx: index('idx_posts_status').on(table.status),
      visibilityIdx: index('idx_posts_visibility').on(table.visibility),
      languageStatusIdx: index('idx_posts_language_status').on(
        table.language,
        table.status
      ),
      languagePostTypeStatusIdx: index('idx_posts_language_post_type_status').on(
        table.language,
        table.postType,
        table.status
      ),
    }
  }
)

export const tags = pgTable(
  'tags',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    postType: postTypeEnum('post_type').default('blog'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => {
    return {
      nameIdx: index('idx_tags_name').on(table.name),
      namePostTypeUnique: unique('tags_name_post_type_unique').on(
        table.name,
        table.postType
      ),
    }
  }
)

export const postTags = pgTable(
  'post_tags',
  {
    postId: uuid('post_id')
      .references(() => posts.id, { onDelete: 'cascade' })
      .notNull(),
    tagId: uuid('tag_id')
      .references(() => tags.id, { onDelete: 'cascade' })
      .notNull(),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.postId, table.tagId] }),
      postIdIdx: index('idx_post_tags_post_id').on(table.postId),
      tagIdIdx: index('idx_post_tags_tag_id').on(table.tagId),
    }
  }
)

// ============================================================================
// GaylyFans Tables
// ============================================================================

// Feed videos — replaces feed-videos.json
export const feedVideos = pgTable(
  'feed_videos',
  {
    id: serial('id').primaryKey(),
    videoUrl: text('video_url').notNull(),
    title: text('title').notNull(),
    creator: text('creator').notNull(),
    creatorAvatar: text('creator_avatar').default('🔥').notNull(),
    likes: integer('likes').default(0).notNull(),
    comments: integer('comments').default(0).notNull(),
    shares: integer('shares').default(0).notNull(),
    tags: jsonb('tags').default('[]').notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    sortOrder: integer('sort_order').default(0).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    isActiveIdx: index('idx_feed_videos_is_active').on(table.isActive),
  })
)

// Scenarios — replaces scenarios.json
export const scenarios = pgTable('scenarios', {
  id: text('id').primaryKey(), // e.g. "achai_new"
  name: text('name').notNull(),
  sourceImageUrl: text('source_image_url'),
  isActive: boolean('is_active').default(true).notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
})

// Scenario variants (A/B testing)
export const scenarioVariants = pgTable(
  'scenario_variants',
  {
    id: text('id').primaryKey(), // e.g. "achai_new_A"
    scenarioId: text('scenario_id')
      .references(() => scenarios.id, { onDelete: 'cascade' })
      .notNull(),
    label: text('label').notNull(), // "Variant A", "Variant B"
    videoUrl: text('video_url').notNull(),
    sortOrder: integer('sort_order').default(0).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    scenarioIdIdx: index('idx_scenario_variants_scenario_id').on(table.scenarioId),
  })
)

// Ratings — replaces Redis rating:* keys
export const ratings = pgTable(
  'ratings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    scenarioId: text('scenario_id')
      .references(() => scenarios.id, { onDelete: 'cascade' })
      .notNull(),
    visitorId: text('visitor_id').notNull(), // anonymous v_xxx or user email
    userId: uuid('user_id').references(() => user.id, { onDelete: 'set null' }),
    ratingsJson: jsonb('ratings_json').notNull(), // [{variantId, stars}]
    bestVariantId: text('best_variant_id'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    scenarioVisitorUnique: unique('ratings_scenario_visitor_unique').on(
      table.scenarioId,
      table.visitorId
    ),
    userIdIdx: index('idx_ratings_user_id').on(table.userId),
    scenarioIdIdx: index('idx_ratings_scenario_id').on(table.scenarioId),
  })
)

// Video likes — replaces localStorage-only likes
export const videoLikes = pgTable(
  'video_likes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    videoId: integer('video_id')
      .references(() => feedVideos.id, { onDelete: 'cascade' })
      .notNull(),
    visitorId: text('visitor_id').notNull(),
    userId: uuid('user_id').references(() => user.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    videoVisitorUnique: unique('video_likes_video_visitor_unique').on(
      table.videoId,
      table.visitorId
    ),
    videoIdIdx: index('idx_video_likes_video_id').on(table.videoId),
  })
)

// Reports — replaces Redis reports
export const reportReasonEnum = pgEnum('report_reason', [
  'not_interested',
  'low_quality',
  'rights_violation',
  'child_content',
  'other',
])

export const reports = pgTable(
  'reports',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    videoId: integer('video_id')
      .references(() => feedVideos.id, { onDelete: 'cascade' })
      .notNull(),
    reason: reportReasonEnum('reason').notNull(),
    detail: text('detail'),
    userAgent: text('user_agent'),
    reviewed: boolean('reviewed').default(false).notNull(),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    reviewedIdx: index('idx_reports_reviewed').on(table.reviewed),
    videoIdIdx: index('idx_reports_video_id').on(table.videoId),
  })
)

// Generation jobs — replaces polling pattern
export const generationStatusEnum = pgEnum('generation_status', [
  'pending',
  'processing',
  'completed',
  'failed',
])

export const generationJobs = pgTable(
  'generation_jobs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .references(() => user.id, { onDelete: 'cascade' })
      .notNull(),
    providerJobId: text('provider_job_id'), // WaveSpeed request ID
    status: generationStatusEnum('status').default('pending').notNull(),
    prompt: text('prompt'),
    sourceImageUrl: text('source_image_url'),
    presetId: text('preset_id'),
    duration: integer('duration').default(5), // seconds
    resultVideoUrl: text('result_video_url'),
    creditsCharged: integer('credits_charged').default(3).notNull(),
    errorMessage: text('error_message'),
    providerResponse: jsonb('provider_response'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    userIdIdx: index('idx_generation_jobs_user_id').on(table.userId),
    statusIdx: index('idx_generation_jobs_status').on(table.status),
    providerJobIdIdx: index('idx_generation_jobs_provider_job_id').on(table.providerJobId),
  })
)

// LoRA presets — replaces lora-presets.json
export const loraPresets = pgTable('lora_presets', {
  id: text('id').primaryKey(), // e.g. "gay_general"
  name: text('name').notNull(),
  description: text('description'),
  loras: jsonb('loras').notNull(), // [{path, scale}]
  isActive: boolean('is_active').default(true).notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
})
