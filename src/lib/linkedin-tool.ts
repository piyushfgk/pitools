import { z } from 'zod';
import * as fs from 'fs/promises';
import { stat } from 'fs/promises';
import { lookup } from 'mime-types';

// Define the MCP Tool Response structure
interface McpToolResponse {
  content: Array<{ type: 'text'; text: string; }>;
  isError?: boolean;
  postId?: string; // Keep postId as it's useful
  [key: string]: unknown;
}

// --- Individual Zod Schemas and Types for each Post Type ---

// 1. Text Post
export const linkedInTextPostInputSchema = z.object({
  commentary: z.string().min(1, { message: "Commentary text cannot be empty." }),
});
export type LinkedInTextPostInputs = z.infer<typeof linkedInTextPostInputSchema>;

// 2. Article Post
export const linkedInArticlePostInputSchema = z.object({
  commentary: z.string().min(1, { message: "Commentary text cannot be empty." }),
  url: z.string().url({ message: "Invalid URL provided for article." }),
  title: z.string().min(1, { message: "Article title cannot be empty." }),
});
export type LinkedInArticlePostInputs = z.infer<typeof linkedInArticlePostInputSchema>;

// 3. Image Post
export const linkedInImagePostInputSchema = z.object({
  commentary: z.string().min(1, { message: "Commentary text cannot be empty." }),
  filePath: z.string().min(1, { message: "Image file path cannot be empty." }),
});
export type LinkedInImagePostInputs = z.infer<typeof linkedInImagePostInputSchema>;

// 4. Video Post
export const linkedInVideoPostInputSchema = z.object({
  commentary: z.string().min(1, { message: "Commentary text cannot be empty." }),
  filePath: z.string().min(1, { message: "Video file path cannot be empty." }),
});
export type LinkedInVideoPostInputs = z.infer<typeof linkedInVideoPostInputSchema>;

// 5. Poll Post
export const linkedInPollPostInputSchema = z.object({
  commentary: z.string().optional(), // Commentary can be optional for polls if question is descriptive
  pollQuestion: z.string().min(1, { message: "Poll question cannot be empty." }),
  pollOptions: z.array(z.string().min(1)).min(2, { message: "Poll must have at least 2 options." }).max(4, { message: "Poll must have at most 4 options." }),
});
export type LinkedInPollPostInputs = z.infer<typeof linkedInPollPostInputSchema>;


// --- Internal Helper Functions (largely unchanged, but no longer exported directly as tool handlers) ---

// Helper to get Access Token and User URN
async function getLinkedInAuthDetailsAndUrn(): Promise<{ accessToken: string; authorUrn: string; userName?: string }> {
  const accessToken = process.env.LINKEDIN_ACCESS_TOKEN;
  if (!accessToken) {
    console.error("Missing environment variable: LINKEDIN_ACCESS_TOKEN");
    throw new Error("LinkedIn Access Token not configured in environment variables.");
  }
  const userInfo = await getLinkedInUserInfoInternal(accessToken); // Renamed to avoid conflict if ever re-exporting
  const authorUrn = 'urn:li:person:' + userInfo.urn;
  return { accessToken, authorUrn, userName: userInfo.name };
}


// --- Get User Info (Internal) --- 
async function getLinkedInUserInfoInternal(accessToken: string): Promise<{ urn: string, name?: string }> {
  if (!accessToken) {
    console.error("Error: Access token is missing for getUserInfo.");
    throw new Error("Access token is missing for getUserInfo.");
  }
  const userInfoUrl = 'https://api.linkedin.com/v2/userinfo';
  try {
    const response = await fetch(userInfoUrl, {
        headers: {
            'Authorization': 'Bearer ' + accessToken,
        }
    });

    const contentType = response.headers.get("content-type");
    if (!response.ok || !contentType || !contentType.includes("application/json")) {
        const errorBody = await response.text();
        console.error('User info fetch failed (' + userInfoUrl + ') - Status: ' + response.status + '. Content-Type: ' + (contentType || 'N/A') + '. Body: ' + errorBody);
        throw new Error('User info fetch failed (' + userInfoUrl + ') - Status: ' + response.status + '. Content-Type: ' + (contentType || 'N/A') + '. Body: ' + errorBody);
    }

    const userInfo = await response.json() as { sub: string, name?: string, given_name?: string, family_name?: string };
    
    if (!userInfo.sub) {
        console.error('User URN (\'sub\' field) not found in /v2/userinfo response. Received keys: ' + Object.keys(userInfo).join(', '));
        throw new Error('User URN (\'sub\' field) not found in /v2/userinfo response. Received keys: ' + Object.keys(userInfo).join(', '));
    }
    
    const userName = userInfo.name || [userInfo.given_name, userInfo.family_name].filter(Boolean).join(' ') || undefined;
    return { urn: userInfo.sub, name: userName };
  } catch (error: any) {
    console.error("Error fetching LinkedIn user info:", error);
    throw new Error('Failed to fetch LinkedIn user information: ' + (error?.message || 'Unknown error'));
  }
}

// --- Post Text Update (Internal) --- 
async function postTextUpdateInternal(accessToken: string, authorUrn: string, textContent: string): Promise<{ success: boolean; message: string; postId?: string }> {
  const postApiUrl = 'https://api.linkedin.com/rest/posts';
  const postBody = {
    author: authorUrn,
    commentary: textContent,
    visibility: "PUBLIC",
    distribution: { feedDistribution: "MAIN_FEED" },
    lifecycleState: "PUBLISHED",
    isReshareDisabledByAuthor: false
  };
  try {
    const response = await fetch(postApiUrl, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + accessToken, 'Content-Type': 'application/json', 'LinkedIn-Version': '202504', 'X-Restli-Protocol-Version': '2.0.0' },
      body: JSON.stringify(postBody)
    });
    const postId = response.headers.get('x-restli-id') || response.headers.get('X-RestLi-Id');
    if (!response.ok) {
      const errorBody = await response.text();
      console.error('LinkedIn API text post failed ' + response.status + ': ' + errorBody);
      return { success: false, message: 'Failed to post text (' + response.status + '): ' + errorBody };
    }
    const successMessage = postId ? 'Successfully posted text! Post ID: ' + postId : 'Successfully posted text!';
    return { success: true, message: successMessage, postId: postId || undefined };
  } catch (error: any) {
    console.error("Error posting text to LinkedIn:", error);
    return { success: false, message: 'Error posting text: ' + error.message };
  }
}

// --- Post Article Update (Internal) ---
async function postArticleUpdateInternal(accessToken: string, authorUrn: string, articleUrl: string, commentaryText: string, articleTitle: string): Promise<{ success: boolean; message: string; postId?: string }> {
  const postApiUrl = 'https://api.linkedin.com/rest/posts';
  const postBody = {
    author: authorUrn,
    commentary: commentaryText,
    visibility: "PUBLIC",
    distribution: { feedDistribution: "MAIN_FEED" },
    content: { article: { source: articleUrl, title: articleTitle } },
    lifecycleState: "PUBLISHED",
    isReshareDisabledByAuthor: false
  };
  try {
    const response = await fetch(postApiUrl, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + accessToken, 'Content-Type': 'application/json', 'LinkedIn-Version': '202504', 'X-Restli-Protocol-Version': '2.0.0' },
      body: JSON.stringify(postBody)
    });
    const postId = response.headers.get('x-restli-id') || response.headers.get('X-RestLi-Id');
    if (!response.ok) {
      const errorBody = await response.text();
      console.error('LinkedIn API article post failed ' + response.status + ': ' + errorBody);
      return { success: false, message: 'Failed to post article (' + response.status + '): ' + errorBody };
    }
    const successMessage = postId ? 'Successfully posted article! Post ID: ' + postId : 'Successfully posted article!';
    return { success: true, message: successMessage, postId: postId || undefined };
  } catch (error: any) {
    console.error("Error posting article to LinkedIn:", error);
    return { success: false, message: 'Error posting article: ' + error.message };
  }
}

// --- Post Image Update (Internal) ---
async function postImageUpdateInternal(accessToken: string, authorUrn: string, imagePath: string, commentaryText: string): Promise<{ success: boolean; message: string; postId?: string }> {
  const initializeUploadUrl = 'https://api.linkedin.com/rest/images?action=initializeUpload';
  const postApiUrl = 'https://api.linkedin.com/rest/posts';
  try {
    const initUploadBody = { initializeUploadRequest: { owner: authorUrn } };
    const initResponse = await fetch(initializeUploadUrl, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + accessToken, 'Content-Type': 'application/json', 'LinkedIn-Version': '202504', 'X-Restli-Protocol-Version': '2.0.0' },
      body: JSON.stringify(initUploadBody)
    });
    if (!initResponse.ok) { const errorBody = await initResponse.text(); throw new Error('Initialize Upload failed ' + initResponse.status + ': ' + errorBody); }
    const initData = await initResponse.json() as { value: { uploadUrl: string, image: string } };
    const { uploadUrl, image: imageUrn } = initData.value;
    const imageBuffer = await fs.readFile(imagePath);
    const imageContentType = lookup(imagePath) || 'application/octet-stream';
    const uploadResponse = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': imageContentType }, body: imageBuffer });
    if (!uploadResponse.ok && uploadResponse.status !== 201 && uploadResponse.status !== 200) { const errorBody = await uploadResponse.text(); throw new Error('Image Upload failed ' + uploadResponse.status + ': ' + errorBody); }
    const postBody = {
      author: authorUrn, commentary: commentaryText, visibility: "PUBLIC", distribution: { feedDistribution: "MAIN_FEED" },
      content: { media: { id: imageUrn } }, lifecycleState: "PUBLISHED", isReshareDisabledByAuthor: false
    };
    const postResponse = await fetch(postApiUrl, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + accessToken, 'Content-Type': 'application/json', 'LinkedIn-Version': '202504', 'X-Restli-Protocol-Version': '2.0.0' },
      body: JSON.stringify(postBody)
    });
    const postId = postResponse.headers.get('x-restli-id') || postResponse.headers.get('X-RestLi-Id');
    if (!postResponse.ok) { const errorBody = await postResponse.text(); throw new Error('Create Image Post failed ' + postResponse.status + ': ' + errorBody); }
    const successMessage = postId ? 'Successfully posted image! Post ID: ' + postId : 'Successfully posted image!';
    return { success: true, message: successMessage, postId: postId || undefined };
  } catch (error: any) {
    console.error("Error during image posting process:", error);
    return { success: false, message: 'Error posting image: ' + error.message };
  }
}

// --- Post Video Update (Internal) ---
async function postVideoUpdateInternal(accessToken: string, authorUrn: string, videoPath: string, commentaryText: string): Promise<{ success: boolean; message: string; postId?: string }> {
  const initializeUploadUrl = 'https://api.linkedin.com/rest/videos?action=initializeUpload'; 
  const postApiUrl = 'https://api.linkedin.com/rest/posts';
  try {
    const videoStatsForInit = await stat(videoPath);
    const initUploadBody = { initializeUploadRequest: { owner: authorUrn, fileSizeBytes: videoStatsForInit.size } };
    const initResponse = await fetch(initializeUploadUrl, { 
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + accessToken, 'Content-Type': 'application/json', 'LinkedIn-Version': '202504', 'X-Restli-Protocol-Version': '2.0.0' },
      body: JSON.stringify(initUploadBody)
    });
    if (!initResponse.ok) { const errorBody = await initResponse.text(); throw new Error('Initialize Video Upload failed ' + initResponse.status + ': ' + errorBody); }
    const initData = await initResponse.json() as { value: { uploadInstructions?: { uploadUrl: string }[], video: string } };
    const videoUrn = initData.value.video;
    const uploadUrl = initData.value.uploadInstructions?.[0]?.uploadUrl;
    if (!uploadUrl) { throw new Error("Could not extract uploadUrl from initialize video response."); }
    const videoBuffer = await fs.readFile(videoPath);
    const videoContentType = lookup(videoPath) || 'application/octet-stream';
    const uploadResponse = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': videoContentType }, body: videoBuffer });
    if (!uploadResponse.ok && uploadResponse.status !== 201 && uploadResponse.status !== 200) { const errorBody = await uploadResponse.text(); throw new Error('Video Upload failed ' + uploadResponse.status + ': ' + errorBody); }
    const postBody = {
      author: authorUrn, commentary: commentaryText, visibility: "PUBLIC", distribution: { feedDistribution: "MAIN_FEED" },
      content: { media: { id: videoUrn } }, lifecycleState: "PUBLISHED", isReshareDisabledByAuthor: false
    };
    const postResponse = await fetch(postApiUrl, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + accessToken, 'Content-Type': 'application/json', 'LinkedIn-Version': '202504', 'X-Restli-Protocol-Version': '2.0.0' },
      body: JSON.stringify(postBody)
    });
    const postId = postResponse.headers.get('x-restli-id') || postResponse.headers.get('X-RestLi-Id');
    if (!postResponse.ok) { const errorBody = await postResponse.text(); throw new Error('Create Video Post failed ' + postResponse.status + ': ' + errorBody); }
    const successMessage = postId ? 'Successfully posted video! Post ID: ' + postId : 'Successfully posted video!';
    return { success: true, message: successMessage, postId: postId || undefined };
  } catch (error: any) {
    console.error("Error during video posting process:", error);
    return { success: false, message: 'Error posting video: ' + error.message };
  }
}

// --- Post Poll Update (Internal) ---
async function postPollUpdateInternal(accessToken: string, authorUrn: string, question: string, options: string[], commentaryText?: string): Promise<{ success: boolean; message: string; postId?: string }> {
  if (options.length < 2 || options.length > 4) {
      return { success: false, message: "Error: Polls must have between 2 and 4 options." };
  }
  const postApiUrl = 'https://api.linkedin.com/rest/posts';
  const postBody = {
    author: authorUrn, commentary: commentaryText || '', visibility: "PUBLIC", distribution: { feedDistribution: "MAIN_FEED" },
    content: { poll: { question: question, options: options.map(opt => ({ text: opt })), settings: { duration: "THREE_DAYS" } } },
    lifecycleState: "PUBLISHED", isReshareDisabledByAuthor: false
  };
  try {
    const postResponse = await fetch(postApiUrl, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + accessToken, 'Content-Type': 'application/json', 'LinkedIn-Version': '202504', 'X-Restli-Protocol-Version': '2.0.0' },
      body: JSON.stringify(postBody)
    });
    const postId = postResponse.headers.get('x-restli-id') || postResponse.headers.get('X-RestLi-Id');
    if (!postResponse.ok) {
      const errorBody = await postResponse.text();
      console.error('LinkedIn API poll post creation failed ' + postResponse.status + ': ' + errorBody);
      return { success: false, message: 'Failed to post poll (' + postResponse.status + '): ' + errorBody };
    }
    const successMessage = postId ? 'Successfully posted poll! Post ID: ' + postId : 'Successfully posted poll!';
    return { success: true, message: successMessage, postId: postId || undefined };
  } catch (error: any) {
    console.error("Error during poll posting process:", error);
    return { success: false, message: 'Error posting poll: ' + error.message };
  }
}

// --- New Exported MCP Tool Functions ---

// 1. Post Text to LinkedIn
export async function postLinkedInText(rawInputs: unknown): Promise<McpToolResponse> {
  const parseResult = linkedInTextPostInputSchema.safeParse(rawInputs);
  if (!parseResult.success) {
    const errorMessages = parseResult.error.errors.map(e => e.path.join('.') + ': ' + e.message).join(', ');
    return { content: [{ type: 'text', text: 'Input validation failed: ' + errorMessages }], isError: true };
  }
  const inputs = parseResult.data;
  try {
    const { accessToken, authorUrn } = await getLinkedInAuthDetailsAndUrn();
    const result = await postTextUpdateInternal(accessToken, authorUrn, inputs.commentary);
    return { content: [{ type: 'text', text: result.message }], isError: !result.success, postId: result.postId };
  } catch (error: any) {
    return { content: [{ type: 'text', text: 'An error occurred: ' + error.message }], isError: true };
  }
}

// 2. Post Article to LinkedIn
export async function postLinkedInArticle(rawInputs: unknown): Promise<McpToolResponse> {
  const parseResult = linkedInArticlePostInputSchema.safeParse(rawInputs);
  if (!parseResult.success) {
    const errorMessages = parseResult.error.errors.map(e => e.path.join('.') + ': ' + e.message).join(', ');
    return { content: [{ type: 'text', text: 'Input validation failed: ' + errorMessages }], isError: true };
  }
  const inputs = parseResult.data;
  try {
    const { accessToken, authorUrn } = await getLinkedInAuthDetailsAndUrn();
    const result = await postArticleUpdateInternal(accessToken, authorUrn, inputs.url, inputs.commentary, inputs.title);
    return { content: [{ type: 'text', text: result.message }], isError: !result.success, postId: result.postId };
  } catch (error: any) {
    return { content: [{ type: 'text', text: 'An error occurred: ' + error.message }], isError: true };
  }
}

// 3. Post Image to LinkedIn
export async function postLinkedInImage(rawInputs: unknown): Promise<McpToolResponse> {
  const parseResult = linkedInImagePostInputSchema.safeParse(rawInputs);
  if (!parseResult.success) {
    const errorMessages = parseResult.error.errors.map(e => e.path.join('.') + ': ' + e.message).join(', ');
    return { content: [{ type: 'text', text: 'Input validation failed: ' + errorMessages }], isError: true };
  }
  const inputs = parseResult.data;
  try {
    const { accessToken, authorUrn } = await getLinkedInAuthDetailsAndUrn();
    const result = await postImageUpdateInternal(accessToken, authorUrn, inputs.filePath, inputs.commentary);
    return { content: [{ type: 'text', text: result.message }], isError: !result.success, postId: result.postId };
  } catch (error: any) {
    return { content: [{ type: 'text', text: 'An error occurred: ' + error.message }], isError: true };
  }
}

// 4. Post Video to LinkedIn
export async function postLinkedInVideo(rawInputs: unknown): Promise<McpToolResponse> {
  const parseResult = linkedInVideoPostInputSchema.safeParse(rawInputs);
  if (!parseResult.success) {
    const errorMessages = parseResult.error.errors.map(e => e.path.join('.') + ': ' + e.message).join(', ');
    return { content: [{ type: 'text', text: 'Input validation failed: ' + errorMessages }], isError: true };
  }
  const inputs = parseResult.data;
  try {
    const { accessToken, authorUrn } = await getLinkedInAuthDetailsAndUrn();
    const result = await postVideoUpdateInternal(accessToken, authorUrn, inputs.filePath, inputs.commentary);
    return { content: [{ type: 'text', text: result.message }], isError: !result.success, postId: result.postId };
  } catch (error: any) {
    return { content: [{ type: 'text', text: 'An error occurred: ' + error.message }], isError: true };
  }
}

// 5. Post Poll to LinkedIn
export async function postLinkedInPoll(rawInputs: unknown): Promise<McpToolResponse> {
  const parseResult = linkedInPollPostInputSchema.safeParse(rawInputs);
  if (!parseResult.success) {
    const errorMessages = parseResult.error.errors.map(e => e.path.join('.') + ': ' + e.message).join(', ');
    return { content: [{ type: 'text', text: 'Input validation failed: ' + errorMessages }], isError: true };
  }
  const inputs = parseResult.data;
  try {
    const { accessToken, authorUrn } = await getLinkedInAuthDetailsAndUrn();
    const result = await postPollUpdateInternal(accessToken, authorUrn, inputs.pollQuestion, inputs.pollOptions, inputs.commentary);
    return { content: [{ type: 'text', text: result.message }], isError: !result.success, postId: result.postId };
  } catch (error: any) {
    return { content: [{ type: 'text', text: 'An error occurred: ' + error.message }], isError: true };
  }
} 