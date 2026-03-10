import { getFeedVideos, getGeneratedVideos } from "@/actions/feed";
import GaylyFansHome from "@/components/gaylyfans/GaylyFansHome";

export default async function Home() {
  const [videos, generatedVideos] = await Promise.all([
    getFeedVideos(),
    getGeneratedVideos(),
  ]);

  return (
    <GaylyFansHome initialVideos={videos} generatedVideos={generatedVideos} />
  );
}
