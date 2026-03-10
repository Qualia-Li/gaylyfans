"use client";

import { useEffect, useState, useMemo } from "react";
import { Container, Heading, Text, Card, Flex, Badge, Button, Select, TextField } from "@radix-ui/themes";

interface EnrichedVideo {
  id: string;
  videoUrl: string;
  thumbnailUrl: string;
  title: string;
  creator: string;
  model: string;
  position: string;
  lora: string;
  clip_score: number | null;
  avgStars: number | null;
  totalRatings: number;
  bestPicks: number;
}

type SortKey = "id" | "clip_score" | "avgStars" | "totalRatings" | "bestPicks";

const POSITION_COLORS: Record<string, "orange" | "red" | "blue" | "green" | "purple" | "pink" | "yellow" | "gray"> = {
  general: "gray",
  facial: "orange",
  oral: "blue",
  handjob: "green",
  anal_cowgirl: "red",
  anal_doggy: "purple",
  anal_missionary: "pink",
  footjob: "yellow",
};

export default function AdminRatingPage() {
  const [videos, setVideos] = useState<EnrichedVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("avgStars");
  const [sortDesc, setSortDesc] = useState(true);
  const [filterPosition, setFilterPosition] = useState<string>("all");
  const [filterModel, setFilterModel] = useState<string>("all");
  const [filterCreator, setFilterCreator] = useState<string>("");
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [modalVideo, setModalVideo] = useState<EnrichedVideo | null>(null);

  useEffect(() => {
    fetch("/api/adm/videos")
      .then(async (r) => {
        if (!r.ok) {
          const data = await r.json();
          throw new Error(data.error);
        }
        return r.json();
      })
      .then((data) => {
        setVideos(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const positions = useMemo(() => [...new Set(videos.map((v) => v.position))].sort(), [videos]);
  const models = useMemo(() => [...new Set(videos.map((v) => v.model))].sort(), [videos]);

  const filtered = useMemo(() => {
    let result = [...videos];
    if (filterPosition !== "all") result = result.filter((v) => v.position === filterPosition);
    if (filterModel !== "all") result = result.filter((v) => v.model === filterModel);
    if (filterCreator) result = result.filter((v) => v.creator.toLowerCase().includes(filterCreator.toLowerCase()));

    result.sort((a, b) => {
      const aVal = a[sortKey] ?? -1;
      const bVal = b[sortKey] ?? -1;
      return sortDesc ? Number(bVal) - Number(aVal) : Number(aVal) - Number(bVal);
    });
    return result;
  }, [videos, filterPosition, filterModel, filterCreator, sortKey, sortDesc]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <Text color="gray">Loading video database...</Text>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <Card className="!bg-zinc-900" size="3">
          <Flex direction="column" align="center" gap="4" py="4">
            <Text size="6">🔒</Text>
            <Heading size="4">{error}</Heading>
            <Text size="2" color="gray">Admin access required.</Text>
          </Flex>
        </Card>
      </div>
    );
  }

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDesc(!sortDesc);
    else { setSortKey(key); setSortDesc(true); }
  };

  const SortHeader = ({ label, field }: { label: string; field: SortKey }) => (
    <th
      className="px-3 py-2 text-left text-xs font-medium text-zinc-400 uppercase cursor-pointer hover:text-white select-none whitespace-nowrap"
      onClick={() => handleSort(field)}
    >
      {label} {sortKey === field ? (sortDesc ? "↓" : "↑") : ""}
    </th>
  );

  return (
    <div className="min-h-screen bg-black text-white">
      <Container size="4" className="px-4 py-8">
        <Heading size="6" mb="2">Video Database</Heading>
        <Text size="2" color="gray" className="mb-6 block">
          {filtered.length} of {videos.length} videos
        </Text>

        {/* Filters */}
        <Flex gap="3" mb="4" wrap="wrap" align="end">
          <div>
            <Text size="1" color="gray" className="block mb-1">Position</Text>
            <Select.Root value={filterPosition} onValueChange={setFilterPosition}>
              <Select.Trigger className="min-w-[140px]" />
              <Select.Content>
                <Select.Item value="all">All positions</Select.Item>
                {positions.map((p) => (
                  <Select.Item key={p} value={p}>{p}</Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
          </div>
          <div>
            <Text size="1" color="gray" className="block mb-1">Model</Text>
            <Select.Root value={filterModel} onValueChange={setFilterModel}>
              <Select.Trigger className="min-w-[120px]" />
              <Select.Content>
                <Select.Item value="all">All models</Select.Item>
                {models.map((m) => (
                  <Select.Item key={m} value={m}>{m}</Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
          </div>
          <div>
            <Text size="1" color="gray" className="block mb-1">Creator</Text>
            <TextField.Root
              placeholder="Filter by creator..."
              value={filterCreator}
              onChange={(e) => setFilterCreator(e.target.value)}
              className="min-w-[160px]"
            />
          </div>
          <Button variant="ghost" color="gray" onClick={() => { setFilterPosition("all"); setFilterModel("all"); setFilterCreator(""); }}>
            Clear
          </Button>
        </Flex>

        {/* Full-screen video modal */}
        {modalVideo && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
            onClick={() => setModalVideo(null)}
          >
            <div
              className="relative max-w-[90vw] max-h-[90vh] flex flex-col items-center"
              onClick={(e) => e.stopPropagation()}
            >
              <video
                src={modalVideo.videoUrl}
                className="max-w-full max-h-[80vh] rounded-lg"
                autoPlay
                loop
                playsInline
                controls
              />
              <div className="mt-3 text-center">
                <Text size="3" weight="medium" className="text-white">{modalVideo.title}</Text>
                <Flex gap="2" justify="center" mt="1">
                  <Badge color={POSITION_COLORS[modalVideo.position] ?? "gray"} variant="soft" size="1">
                    {modalVideo.position}
                  </Badge>
                  <Badge color={modalVideo.model === "wan2.2" ? "blue" : "gray"} variant="outline" size="1">
                    {modalVideo.model}
                  </Badge>
                  <Text size="1" color="gray">{modalVideo.lora}</Text>
                </Flex>
                {modalVideo.avgStars !== null && modalVideo.avgStars > 0 && (
                  <Text size="2" className="text-orange-400 mt-1 block">
                    {modalVideo.avgStars.toFixed(1)} ★ ({modalVideo.totalRatings} ratings)
                  </Text>
                )}
              </div>
              <button
                className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-zinc-800 text-white flex items-center justify-center hover:bg-zinc-700"
                onClick={() => setModalVideo(null)}
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto rounded-lg border border-zinc-800">
          <table className="w-full text-sm">
            <thead className="bg-zinc-900 border-b border-zinc-800">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-zinc-400 uppercase w-[120px]">Preview</th>
                <SortHeader label="ID" field="id" />
                <th className="px-3 py-2 text-left text-xs font-medium text-zinc-400 uppercase">Title</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-zinc-400 uppercase">Creator</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-zinc-400 uppercase">Position</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-zinc-400 uppercase">Model</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-zinc-400 uppercase">LoRA</th>
                <SortHeader label="CLIP" field="clip_score" />
                <SortHeader label="Rating" field="avgStars" />
                <SortHeader label="# Rated" field="totalRatings" />
                <SortHeader label="Best" field="bestPicks" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((v) => (
                <tr key={v.id} className="border-b border-zinc-800/50 hover:bg-zinc-900/50">
                  <td className="px-3 py-2">
                    <div
                      className="w-[100px] h-[56px] bg-zinc-800 rounded overflow-hidden cursor-pointer relative"
                      onClick={() => setModalVideo(v)}
                    >
                      {v.thumbnailUrl ? (
                        <img
                          src={v.thumbnailUrl}
                          alt={v.title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full bg-zinc-700" />
                      )}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/0 transition-colors">
                        <svg className="h-5 w-5 text-white/70" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-zinc-400 font-mono text-xs">{v.id}</td>
                  <td className="px-3 py-2 text-white max-w-[200px] truncate">{v.title}</td>
                  <td className="px-3 py-2 text-zinc-300">@{v.creator}</td>
                  <td className="px-3 py-2">
                    <Badge color={POSITION_COLORS[v.position] ?? "gray"} variant="soft" size="1">
                      {v.position}
                    </Badge>
                  </td>
                  <td className="px-3 py-2">
                    <Badge color={v.model === "wan2.2" ? "blue" : "gray"} variant="outline" size="1">
                      {v.model}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 text-zinc-400 text-xs max-w-[220px]">
                    <span title={v.lora} className="block truncate">{v.lora}</span>
                  </td>
                  <td className="px-3 py-2 text-zinc-300 tabular-nums">{v.clip_score?.toFixed(1) ?? "-"}</td>
                  <td className="px-3 py-2 tabular-nums font-medium">
                    {v.avgStars !== null && v.avgStars > 0 ? (
                      <Badge color="orange" variant="solid" size="1">
                        {v.avgStars.toFixed(1)} ★
                      </Badge>
                    ) : (
                      <span className="text-zinc-600">-</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-zinc-300 tabular-nums">{v.totalRatings || "-"}</td>
                  <td className="px-3 py-2 text-zinc-300 tabular-nums">{v.bestPicks || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Container>
    </div>
  );
}
