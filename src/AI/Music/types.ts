interface Metadata {
  tags: string;
  type: string;
  prompt: string;
  stream: boolean;
  history: any; // Assuming history can be any type
  duration: number;
  error_type: any; // Assuming error_type can be any type
  error_message: any; // Assuming error_message can be any type
  concat_history: any; // Assuming concat_history can be any type
  refund_credits: boolean;
  audio_prompt_id: any; // Assuming audio_prompt_id can be any type
  gpt_description_prompt: string;
}

export interface DataItem {
  id: string;
  title: string;
  status: string;

  text?: string;
  handle?: string;
  user_id?: string;
  is_liked?: boolean;
  metadata?: Metadata;
  reaction?: any; // Assuming reaction can be any type
  audio_url?: string;
  image_url?: string;
  is_public?: boolean;
  video_url?: string;
  created_at?: string;
  is_trashed?: boolean;
  model_name?: string;
  play_count?: number;
  display_name?: string;
  upvote_count?: number;
  image_large_url?: string;
  is_video_pending?: boolean;
  is_handle_updated?: boolean;
  major_model_version?: string;
}

export interface TaskData {
  task_id: string;
  notify_hook: string;
  action: string;
  status: string;
  fail_reason: string;
  submit_time: number;
  start_time: number;
  finish_time: number;
  progress: string;
}

export interface CreateMusicResponseData {
  code: string;
  message: string;
  data: (TaskData & { data: DataItem[] })[];
}

export interface LyricsGenerationResponseData {
  code: string;
  message: string;
  data: (TaskData & { data: DataItem })[];
}

export type CreateMusicParams = {
  title?: string;
  tags?: string;
  make_instrumental: boolean;
  prompt?: string;
  task_id?: string;
  continue_clip_id?: string;
  continue_at?: number;
  gpt_description_prompt?: string;
  lyrics?: string;
};

export interface SunoResponse {
  id: string;
  title: string;
  status: string;

  text?: string;
  handle?: string;
  user_id?: string;
  is_liked?: boolean;
  metadata?: Metadata;
  reaction?: any; // Assuming reaction can be any type
  audio_url?: string;
  image_url?: string;
  is_public?: boolean;
  video_url?: string;
  created_at?: string;
  is_trashed?: boolean;
  model_name?: string;
  play_count?: number;
  display_name?: string;
  upvote_count?: number;
  image_large_url?: string;
  is_video_pending?: boolean;
  is_handle_updated?: boolean;
  major_model_version?: string;
}
