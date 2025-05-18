import { z } from 'zod';

/**
 * Zod schema for the input of the Instagram image posting tool.
 * Requires a publicly accessible image URL and an optional caption.
 */
export const instagramPostImageInputSchema = z.object({
  imageUrl: z.string().url({ message: "Invalid or missing image URL. Must be a publicly accessible URL." }),
  caption: z.string().optional().describe("Optional caption for the Instagram post."),
});

export type InstagramPostImageInput = z.infer<typeof instagramPostImageInputSchema>;

// We will add the handler function and API call logic here later. 

const INSTAGRAM_API_VERSION = 'v22.0'; // Current Instagram Graph API version

interface InstagramMediaContainerResponse {
  id: string;
}

interface InstagramMediaPublishResponse {
  id: string; // This is the ID of the published post
}

/**
 * Posts an image to Instagram using the provided image URL and optional caption.
 * Reads INSTAGRAM_ACCESS_TOKEN and INSTAGRAM_BUSINESS_ACCOUNT_ID from environment variables.
 */
export async function postInstagramImage(
  input: InstagramPostImageInput
): Promise<{ content: { type: 'text'; text: string }[]; isError?: boolean }> {
  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
  const instagramPostingUserId = process.env.INSTAGRAM_USER_ID_FOR_POSTING; 

  if (!accessToken) {
    return { 
      content: [{ type: 'text', text: 'Error: INSTAGRAM_ACCESS_TOKEN is not set in environment variables.' }],
      isError: true 
    };
  }
  if (!instagramPostingUserId) {
    return { 
      content: [{ type: 'text', text: 'Error: INSTAGRAM_USER_ID_FOR_POSTING is not set in environment variables.' }],
      isError: true 
    };
  }

  const { imageUrl, caption } = input;

  // Step 1: Create Media Container
  const mediaContainerUrl = `https://graph.instagram.com/${instagramPostingUserId}/media`;
  
  const mediaContainerParams = new URLSearchParams();
  mediaContainerParams.append('image_url', imageUrl);
  mediaContainerParams.append('access_token', accessToken);
  if (caption) {
    mediaContainerParams.append('caption', caption);
  }

  try {
    console.error(`Attempting to create media container for image: ${imageUrl}`);
    const containerResponse = await fetch(mediaContainerUrl, {
      method: 'POST',
      body: mediaContainerParams.toString(),
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      }
    });

    const containerResponseText = await containerResponse.text(); // Read text first for better error diagnosis
    let containerData;
    try {
        containerData = JSON.parse(containerResponseText);
    } catch (e) {
        console.error('Failed to parse JSON from create media container response:', containerResponseText);
        return {
            content: [{ type: 'text', text: `Error: Failed to parse JSON from create media container response. Status: ${containerResponse.status}. Response: ${containerResponseText}` }],
            isError: true,
        };
    }
    
    if (!containerResponse.ok) {
      console.error('Error creating media container:', containerData);
      // Check if containerData has an error property, which is typical for Facebook API errors
      const errorMessage = containerData?.error?.message || containerResponse.statusText || 'Unknown error creating container';
      return {
        content: [{ type: 'text', text: `Error: Failed to create media container: ${errorMessage}` }],
        isError: true,
      };
    }

    // Ensure containerData is cast to the correct type AFTER checking for errors
    const successfulContainerData = containerData as InstagramMediaContainerResponse;

    const creationId = successfulContainerData.id;
    if (!creationId) {
        console.error('No creation ID found in media container response:', successfulContainerData);
        return { 
          content: [{ type: 'text', text: 'Error: Failed to get creation ID from media container response.' }],
          isError: true 
        };
    }
    console.error(`Media container created successfully. Creation ID: ${creationId}`);

    // It's sometimes recommended to wait a few seconds before attempting to publish the container.
    // This gives Instagram's servers time to process the uploaded media.
    console.error('Waiting for 7 seconds before publishing...');
    await new Promise(resolve => setTimeout(resolve, 7000)); // 7-second delay

    // Step 2: Publish Media Container
    const mediaPublishUrl = `https://graph.instagram.com/${instagramPostingUserId}/media_publish`;
    const mediaPublishParams = new URLSearchParams();
    mediaPublishParams.append('creation_id', creationId);
    mediaPublishParams.append('access_token', accessToken);
    
    console.error(`Attempting to publish media container with ID: ${creationId}`);
    const publishResponse = await fetch(mediaPublishUrl, {
      method: 'POST',
      body: mediaPublishParams.toString(),
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      }
    });

    const publishResponseText = await publishResponse.text();
    let publishData;
    try {
        publishData = JSON.parse(publishResponseText);
    } catch (e) {
        console.error('Failed to parse JSON from publish media container response:', publishResponseText);
        return {
            content: [{ type: 'text', text: `Error: Failed to parse JSON from publish media container response. Status: ${publishResponse.status}. Response: ${publishResponseText}` }],
            isError: true,
        };
    }

    if (!publishResponse.ok) {
      console.error('Error publishing media container:', publishData);
      // Check if publishData has an error property
      const errorMessage = publishData?.error?.message || publishResponse.statusText || 'Unknown error publishing';
      return {
        content: [{ type: 'text', text: `Error: Failed to publish media container: ${errorMessage}` }],
        isError: true,
      };
    }

    // Ensure publishData is cast to the correct type AFTER checking for errors
    const successfulPublishData = publishData as InstagramMediaPublishResponse;
    console.error('Media published successfully. Post ID:', successfulPublishData.id);
    return { 
      content: [{ type: 'text', text: `Successfully posted image to Instagram. Post ID: ${successfulPublishData.id}` }]
    };

  } catch (error: any) {
    console.error('An unexpected error occurred during Instagram post:', error);
    return { 
      content: [{ type: 'text', text: `Error: ${error.message || 'An unexpected error occurred.'}` }],
      isError: true 
    };
  }
} 