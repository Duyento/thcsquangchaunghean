import heroImage from "./images/hero_gender_equality_1794298223798.jpg";
import stemImage from "./images/stem_and_dreams_1794298224995.jpg";
import campaignImage from "./images/youth_action_campaign_1794298224215.jpg";

export const siteImages = {
  hero: heroImage,
  stem: stemImage,
  campaign: campaignImage,
};

const legacyImageUrls: Record<string, string> = {
  "/src/assets/images/hero_gender_equality_1794298223798.jpg": heroImage,
  "/src/assets/images/stem_and_dreams_1794298224995.jpg": stemImage,
  "/src/assets/images/youth_action_campaign_1794298224215.jpg": campaignImage,
};

export function resolveSiteImageUrl(url: string): string {
  return legacyImageUrls[url] ?? url;
}

export function publicAssetUrl(path: string): string {
  return `${import.meta.env.BASE_URL}${path.replace(/^\/+/, "")}`;
}
