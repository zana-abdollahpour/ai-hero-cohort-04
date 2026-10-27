CREATE TABLE `instructor_notifications` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`instructor_id` integer NOT NULL,
	`learner_id` integer NOT NULL,
	`course_id` integer NOT NULL,
	`enrollment_id` integer,
	`created_at` text NOT NULL,
	`read_at` text,
	FOREIGN KEY (`instructor_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`learner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`enrollment_id`) REFERENCES `enrollments`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `instructor_notifications_enrollment_unique` ON `instructor_notifications` (`enrollment_id`);--> statement-breakpoint
CREATE INDEX `instructor_notifications_recipient_created_at_idx` ON `instructor_notifications` (`instructor_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `instructor_notifications_recipient_read_at_idx` ON `instructor_notifications` (`instructor_id`,`read_at`);