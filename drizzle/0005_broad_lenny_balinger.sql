CREATE TABLE `analytics_flag_dismissals` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`instructor_id` integer NOT NULL,
	`course_id` integer NOT NULL,
	`flag_key` text NOT NULL,
	`dismissed_value` real NOT NULL,
	`dismissed_at` text NOT NULL,
	`cleared_at` text,
	FOREIGN KEY (`instructor_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `analytics_flag_dismissals_owner_course_key_unique` ON `analytics_flag_dismissals` (`instructor_id`,`course_id`,`flag_key`);