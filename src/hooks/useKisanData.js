import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { kisan } from "@/api/kisanClient";

export const useProfile = () =>
  useQuery({ queryKey: ["profile"], queryFn: () => kisan.entities.FarmerProfile.get() });

export const useUpdateProfile = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch) => kisan.entities.FarmerProfile.update(patch),
    onSuccess: (data) => qc.setQueryData(["profile"], data),
  });
};

export const useSettings = () =>
  useQuery({ queryKey: ["settings"], queryFn: () => kisan.entities.Settings.get() });

export const useUpdateSettings = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch) => kisan.entities.Settings.update(patch),
    onSuccess: (data) => qc.setQueryData(["settings"], data),
  });
};

/** True on the demo farm, whose fields, tasks and sowing dates are sample data. */
export const useIsDemo = () => {
  const { data: p } = useProfile();
  return Boolean(p) && kisan.isDemo();
};

export const useFields = () => useQuery({ queryKey: ["fields"], queryFn: () => kisan.entities.Field.list() });
export const useTasks = () => useQuery({ queryKey: ["tasks"], queryFn: () => kisan.entities.Task.list() });
/** Live forecast for the profile's district/tehsil (refetches when the location changes). */
export const useWeather = () => {
  const { data: p } = useProfile();
  return useQuery({
    queryKey: ["weather", p?.district_id || p?.district || null, p?.tehsil || null, p?.lat ?? null],
    queryFn: () => kisan.services.getWeather(p),
    enabled: !!p,
    staleTime: 10 * 60 * 1000,
    refetchInterval: 15 * 60 * 1000,
  });
};

/** Hour-by-hour forecast for the weather chart. */
export const useHourly = () => {
  const { data: p } = useProfile();
  return useQuery({
    queryKey: ["hourly", p?.lat ?? null, p?.lng ?? null],
    queryFn: () => kisan.services.getHourly(p),
    enabled: !!p,
    staleTime: 30 * 60 * 1000,
  });
};

/** Current air quality at the farm, refreshed every 10 minutes. */
export const useAir = () => {
  const { data: p } = useProfile();
  return useQuery({
    queryKey: ["air", p?.lat ?? null, p?.lng ?? null],
    queryFn: () => kisan.services.getAir(p),
    enabled: !!p,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
  });
};

/** Government soil survey at the farm (live for US farms). */
export const useSoilSurvey = () => {
  const { data: p } = useProfile();
  return useQuery({
    queryKey: ["soil-survey", p?.country || "PK", p?.lat ?? null, p?.lng ?? null],
    queryFn: () => kisan.services.getSoilSurvey(p),
    enabled: !!p,
    staleTime: 24 * 60 * 60 * 1000,
  });
};

export const useUSSearch = (q) =>
  useQuery({
    queryKey: ["us-search", q],
    queryFn: () => kisan.services.searchUS(q),
    enabled: (q || "").trim().length >= 2,
    staleTime: 60 * 60 * 1000,
    placeholderData: (prev) => prev,
  });

/** NASA POWER data for the profile's district (changes slowly, so cached for hours). */
export const useNasa = () => {
  const { data: p } = useProfile();
  return useQuery({
    queryKey: ["nasa", p?.district_id || null],
    queryFn: () => kisan.services.getNasa(p),
    enabled: !!p,
    staleTime: 6 * 60 * 60 * 1000,
  });
};

/** 20-year NASA POWER climate history for the profile's district (rotation planner). */
export const useClimate = () => {
  const { data: p } = useProfile();
  return useQuery({
    queryKey: ["climate", p?.district_id || null, p?.lat ?? null, p?.lng ?? null],
    queryFn: () => kisan.services.getClimate(p),
    enabled: !!p,
    staleTime: 24 * 60 * 60 * 1000,
  });
};

// Pakistan district database. Reference data changes rarely, so cache for long.
const GEO_STALE = 60 * 60 * 1000;
export const useGeoProvinces = () =>
  useQuery({ queryKey: ["geo", "provinces"], queryFn: () => kisan.services.geo.provinces(), staleTime: GEO_STALE });
export const useGeoProvince = (id) =>
  useQuery({ queryKey: ["geo", "province", id], queryFn: () => kisan.services.geo.province(id), enabled: !!id, staleTime: GEO_STALE });
export const useGeoDistrict = (id) =>
  useQuery({ queryKey: ["geo", "district", id], queryFn: () => kisan.services.geo.district(id), enabled: !!id, staleTime: GEO_STALE });
export const useGeoSearch = (q) =>
  useQuery({
    queryKey: ["geo", "search", q],
    queryFn: () => kisan.services.geo.search(q),
    enabled: (q || "").trim().length >= 2,
    staleTime: GEO_STALE,
    placeholderData: (prev) => prev,
  });
export const useConversations = () =>
  useQuery({ queryKey: ["conversations"], queryFn: () => kisan.entities.Conversation.list() });
export const usePlans = () => useQuery({ queryKey: ["plans"], queryFn: () => kisan.entities.Plan.list() });

export const useKnowledge = () =>
  useQuery({ queryKey: ["knowledge"], queryFn: () => kisan.entities.KnowledgeArticle.list() });

/** Generic create/update/delete for a collection entity, refreshing its list. */
export function useEntityMutations(entity, key) {
  const qc = useQueryClient();
  const refresh = () => qc.invalidateQueries({ queryKey: [key] });
  return {
    create: useMutation({ mutationFn: (d) => kisan.entities[entity].create(d), onSuccess: refresh }),
    update: useMutation({ mutationFn: ({ id, ...p }) => kisan.entities[entity].update(id, p), onSuccess: refresh }),
    remove: useMutation({ mutationFn: (id) => kisan.entities[entity].delete(id), onSuccess: refresh }),
  };
}
