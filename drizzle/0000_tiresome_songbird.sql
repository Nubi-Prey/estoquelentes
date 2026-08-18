CREATE TABLE `lens_variants` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`category` text NOT NULL,
	`sphere_hundredths` integer NOT NULL,
	`cylinder_hundredths` integer NOT NULL,
	`quantity` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	CONSTRAINT "quantity_non_negative" CHECK("lens_variants"."quantity" >= 0),
	CONSTRAINT "sphere_step_quarter" CHECK("lens_variants"."sphere_hundredths" % 25 = 0),
	CONSTRAINT "cylinder_step_quarter" CHECK("lens_variants"."cylinder_hundredths" % 25 = 0),
	CONSTRAINT "cylinder_non_positive" CHECK("lens_variants"."cylinder_hundredths" <= 0),
	CONSTRAINT "sphere_sign_matches_category" CHECK(("lens_variants"."category" = 'positive' AND "lens_variants"."sphere_hundredths" >= 0)
          OR ("lens_variants"."category" = 'negative' AND "lens_variants"."sphere_hundredths" < 0))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `lens_variants_variant_unique` ON `lens_variants` (`category`,`sphere_hundredths`,`cylinder_hundredths`);--> statement-breakpoint
CREATE TABLE `stock_history` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`variant_id` integer NOT NULL,
	`delta` integer NOT NULL,
	`resulting_quantity` integer NOT NULL,
	`source` text DEFAULT 'manual' NOT NULL,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	FOREIGN KEY (`variant_id`) REFERENCES `lens_variants`(`id`) ON UPDATE no action ON DELETE cascade
);
