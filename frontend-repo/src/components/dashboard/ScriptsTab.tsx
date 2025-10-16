import { useState, useEffect } from "react";
import {
  Plus,
  Search,
  Filter,
  CheckCircle,
  Clock,
  Sparkles,
  List,
  Calendar,
  Edit3,
  Trash2,
  FileText,
  ChevronDown,
  X,
  MoreVertical,
  Grid3X3,
  LayoutList,
  ArrowUpDown,
  Video,
} from "lucide-react";

import { useRouter } from "next/navigation";
import { useParams } from "next/navigation";
const DO_NOT_SHOW_WEB_CAM_PROMPT = "doNotShowWebcamPrompt";

type Script = {
  _id: string;
  title: string;
  content: string;
  status: string;
  category: string;
  duration?: string;
  views?: number;
  likes?: number;
  created?: string;
  estimatedDuration?: number;
  templateType?: "custom" | "trending" | "ai_generated" | "batch_generated";
  isPublic?: boolean;
  aiGenerated: boolean;
  createdAt: Date;
};

interface ScriptsProps {
  scripts: Script[];
  filterIsPublic: string;
  filterMinDuration: string;
  filterMaxDuration: string;
  filterTemplateType: string;
  filterAiGenerated: string;
  filterStartDate: string;
  filterEndDate: string;
  setFilterIsPublic: (str: string) => void;
  setFilterMinDuration: (str: string) => void;
  setFilterMaxDuration: (str: string) => void;
  setFilterTemplateType: (str: string) => void;
  setFilterAiGenerated: (str: string) => void;
  setFilterStartDate: (str: string) => void;
  setFilterEndDate: (str: string) => void;
  setShowFilterPanel: (str: boolean) => void;
  fetchScripts: () => void;
  deleteScript: (scriptId: string) => void;
  scriptsLoading: boolean;
  showFilterPanel: boolean;
  scriptsError: string | null;
}

const ScriptsTab = ({
  scripts,
  filterIsPublic,
  filterMinDuration,
  filterMaxDuration,
  filterAiGenerated,
  filterTemplateType,
  filterStartDate,
  filterEndDate,
  scriptsError,
  fetchScripts,
  deleteScript,
  showFilterPanel,
  setShowFilterPanel,
  setFilterIsPublic,
  setFilterMinDuration,
  setFilterMaxDuration,
  setFilterAiGenerated,
  setFilterTemplateType,
  setFilterStartDate,
  setFilterEndDate,
  scriptsLoading,
}: ScriptsProps) => {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState(""); // Your original search query state
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery); // New state for debounced value
  const [activeScriptMenu, setActiveScriptMenu] = useState<null | string>(null);
  const [isListView, setIsListView] = useState(true);
  const [sortBy, setSortBy] = useState("created_desc"); // New sort state
  const [showSortDropdown, setShowSortDropdown] = useState(false); // New sort dropdown state
  const { scriptId } = useParams();

  const uniqueTemplateTypes = [
    "All",
    ...Array.from(
      new Set(scripts.map((script: Script) => script.templateType))
    ),
  ];

  // Sort options
  const sortOptions = [
    { value: "created_desc", label: "Newest First" },
    { value: "created_asc", label: "Oldest First" },
    { value: "title_asc", label: "Title A-Z" },
    { value: "title_desc", label: "Title Z-A" },
    { value: "duration_asc", label: "Shortest First" },
    { value: "duration_desc", label: "Longest First" },
  ];

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300); // 300ms is a good starting point

    // Cleanup function to clear the timeout if searchQuery changes before the timeout fires
    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery]); // Dependency array: run this effect only when searchQuery changes

  const filteredScripts = scripts.filter((script: Script) => {
    const matchesSearch =
      script.title.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) || // USE DEBOUNCED HERE
      script.content.toLowerCase().includes(debouncedSearchQuery.toLowerCase()); // USE DEBOUNCED HERE

    const matchesIsPublic =
      filterIsPublic === "All" ||
      (filterIsPublic === "True" && script.isPublic) ||
      (filterIsPublic === "False" && !script.isPublic);

    const matchesDuration =
      (filterMinDuration === "" ||
        (script.estimatedDuration &&
          script.estimatedDuration >= parseInt(filterMinDuration))) &&
      (filterMaxDuration === "" ||
        (script.estimatedDuration &&
          script.estimatedDuration <= parseInt(filterMaxDuration)));

    const matchesAiGenerated =
      filterAiGenerated === "All" ||
      (filterAiGenerated === "True" && script.aiGenerated) ||
      (filterAiGenerated === "False" && !script.aiGenerated);

    const matchesTemplateType =
      filterTemplateType === "All" ||
      script.templateType === filterTemplateType;

    const matchesDate =
      (filterStartDate === "" ||
        new Date(script.createdAt) >= new Date(filterStartDate)) &&
      (filterEndDate === "" ||
        new Date(script.createdAt) <= new Date(filterEndDate));

    return (
      matchesSearch &&
      matchesIsPublic &&
      matchesDuration &&
      matchesAiGenerated &&
      matchesTemplateType &&
      matchesDate
    );
  });

  // Sort the filtered scripts
  const sortedAndFilteredScripts = [...filteredScripts].sort((a, b) => {
    switch (sortBy) {
      case "created_asc":
        return (
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
      case "created_desc":
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      case "title_asc":
        return a.title.localeCompare(b.title);
      case "title_desc":
        return b.title.localeCompare(a.title);
      case "duration_asc":
        return (a.estimatedDuration || 0) - (b.estimatedDuration || 0);
      case "duration_desc":
        return (b.estimatedDuration || 0) - (a.estimatedDuration || 0);
      default:
        return 0;
    }
  });

  // Function to clear all filters
  const clearAllFilters = () => {
    setFilterIsPublic("All");
    setFilterMinDuration("");
    setFilterMaxDuration("");
    setFilterAiGenerated("All");
    setFilterTemplateType("All");
    setFilterStartDate("");
    setFilterEndDate("");
  };

  const toggleScriptMenu = (scriptId: string) => {
    setActiveScriptMenu(activeScriptMenu === scriptId ? null : scriptId);
  };
  const handleProceedToRecording = (id: string) => {
      router.push(`/record?scriptId=${id}`);
  };
  return (
    <div className="min-h-screen p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Section */}
        <div className="flex flex-col space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
                Your Scripts
              </h1>
              <p className="text-gray-400 text-sm md:text-base">
                Manage and create your video scripts
              </p>
            </div>
            <button
              onClick={() => router.push("/new")}
              className="w-full sm:w-auto bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-3 rounded-xl font-semibold hover:shadow-lg hover:shadow-purple-500/25 transition-all duration-300 transform hover:scale-105 active:scale-95 flex items-center justify-center space-x-2"
            >
              <Plus className="w-5 h-5" />
              <span>New Script</span>
            </button>
          </div>

          {/* Search and Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search scripts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-purple-500/50 focus:bg-white/10 transition-all"
              />
            </div>

            {/* Layout Toggle - Hidden on mobile */}
            <div className="hidden md:flex items-center bg-white/5 border border-white/10 rounded-xl overflow-hidden">
              <button
                onClick={() => setIsListView(false)}
                className={`flex items-center justify-center p-3 transition-all ${
                  !isListView
                    ? "bg-purple-500/20 text-purple-400"
                    : "text-gray-400 hover:text-white hover:bg-white/10"
                }`}
              >
                <Grid3X3 className="w-5 h-5" />
              </button>
              <button
                onClick={() => setIsListView(true)}
                className={`flex items-center justify-center p-3 transition-all ${
                  isListView
                    ? "bg-purple-500/20 text-purple-400"
                    : "text-gray-400 hover:text-white hover:bg-white/10"
                }`}
              >
                <LayoutList className="w-5 h-5" />
              </button>
            </div>

            {/* Sort and Filter Buttons Container */}
            <div className="flex gap-3 sm:flex-shrink-0">
              {/* Sort Dropdown */}
              <div className="relative flex-1 sm:flex-initial">
                <button
                  onClick={() => setShowSortDropdown(!showSortDropdown)}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                >
                  <ArrowUpDown className="w-5 h-5" />
                  <span>Sort</span>
                  <ChevronDown
                    className={`w-4 h-4 transition-transform ${
                      showSortDropdown ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {/* Sort Dropdown Menu */}
                {showSortDropdown && (
                  <div className="absolute top-full mt-2 right-0 bg-gray-800/95 backdrop-blur-sm border border-white/20 rounded-xl shadow-lg py-2 min-w-[180px] z-50">
                    {sortOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => {
                          setSortBy(option.value);
                          setShowSortDropdown(false);
                        }}
                        className={`flex items-center justify-between w-full px-4 py-2 text-sm transition-colors ${
                          sortBy === option.value
                            ? "text-purple-400 bg-purple-500/10"
                            : "text-gray-300 hover:text-white hover:bg-white/10"
                        }`}
                      >
                        <span>{option.label}</span>
                        {sortBy === option.value && (
                          <CheckCircle className="w-4 h-4" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="relative flex-1 sm:flex-initial">
                <button
                  onClick={() => setShowFilterPanel(!showFilterPanel)}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                >
                  <Filter className="w-5 h-5" />
                  <span>Filter</span>
                  <ChevronDown
                    className={`w-4 h-4 transition-transform ${
                      showFilterPanel ? "rotate-180" : ""
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Filter Panel */}
        {showFilterPanel && (
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden">
            <div className="p-4 md:p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-white">
                  Script Filters
                </h3>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={clearAllFilters}
                    className="text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    Clear All
                  </button>
                  <button
                    onClick={() => setShowFilterPanel(false)}
                    className="text-gray-400 hover:text-white transition-colors md:hidden"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {/* Public Status Filter */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-300">
                    Public Status
                  </label>
                  <div className="relative">
                    <select
                      value={filterIsPublic}
                      onChange={(e) => setFilterIsPublic(e.target.value)}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white appearance-none focus:outline-none focus:border-purple-500/50 focus:bg-white/20 transition-all"
                    >
                      <option value="All">All</option>
                      <option value="True">Public</option>
                      <option value="False">Private</option>
                    </select>
                    <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                {/* Duration Filters */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-300">
                    Min Duration (min)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      placeholder="0"
                      value={filterMinDuration}
                      onChange={(e) => setFilterMinDuration(e.target.value)}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-purple-500/50 focus:bg-white/20 transition-all"
                    />
                    <Clock className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-300">
                    Max Duration (min)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      placeholder="∞"
                      value={filterMaxDuration}
                      onChange={(e) => setFilterMaxDuration(e.target.value)}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-purple-500/50 focus:bg-white/20 transition-all"
                    />
                    <Clock className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                {/* AI Generated Filter */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-300">
                    AI Generated
                  </label>
                  <div className="relative">
                    <select
                      value={filterAiGenerated}
                      onChange={(e) => setFilterAiGenerated(e.target.value)}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white appearance-none focus:outline-none focus:border-purple-500/50 focus:bg-white/20 transition-all"
                    >
                      <option value="All">All</option>
                      <option value="True">Yes</option>
                      <option value="False">No</option>
                    </select>
                    <Sparkles className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                {/* Template Type Filter */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-300">
                    Template Type
                  </label>
                  <div className="relative">
                    <select
                      value={filterTemplateType}
                      onChange={(e) => setFilterTemplateType(e.target.value)}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white appearance-none focus:outline-none focus:border-purple-500/50 focus:bg-white/20 transition-all"
                    >
                      {uniqueTemplateTypes.map((type) => (
                        <option key={type} value={type}>
                          {type === "All"
                            ? "All Types"
                            : (type as string).charAt(0).toUpperCase() +
                              (type as string).slice(1)}
                        </option>
                      ))}
                    </select>
                    <List className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                {/* Date Filters */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-300">
                    Start Date
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      value={filterStartDate}
                      onChange={(e) => setFilterStartDate(e.target.value)}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:border-purple-500/50 focus:bg-white/20 transition-all"
                    />
                    <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-300">
                    End Date
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      value={filterEndDate}
                      onChange={(e) => setFilterEndDate(e.target.value)}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:border-purple-500/50 focus:bg-white/20 transition-all"
                    />
                    <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error State */}
        {scriptsError && (
          <div className="p-4 bg-red-500/20 border border-red-400/30 rounded-xl text-red-400">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <span>Error loading scripts: {scriptsError}</span>
              <button
                onClick={fetchScripts}
                className="px-4 py-2 bg-red-500/30 rounded-lg text-sm hover:bg-red-500/40 transition-colors self-start"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Scripts Display */}
        {scriptsLoading ? (
          <div   
            className={
              isListView
                ? "space-y-4"
                : "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6"
            }
          >
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className={`p-4 md:p-6 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl animate-pulse ${
                  isListView ? "flex items-center space-x-4" : ""
                }`}
              >
                {isListView ? (
                  <>
                    <div className="w-12 h-12 bg-gray-600 rounded-xl flex-shrink-0"></div>
                    <div className="flex-1">
                      <div className="h-5 bg-gray-600 rounded mb-2"></div>
                      <div className="h-4 bg-gray-700 rounded mb-2"></div>
                      <div className="h-3 bg-gray-700 rounded w-1/2"></div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="h-6 bg-gray-600 rounded mb-4"></div>
                    <div className="h-4 bg-gray-700 rounded mb-2"></div>
                    <div className="h-4 bg-gray-700 rounded w-3/4 mb-4"></div>
                    <div className="flex justify-between">
                      <div className="h-4 bg-gray-700 rounded w-1/4"></div>
                      <div className="h-4 bg-gray-700 rounded w-1/4"></div>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        ) : (
          
          <div 
            className={
              isListView
                ? "space-y-3 relative"
                : "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6 relative"
            }
            
          >
            {/* eslint-disable-next-line @typescript-eslint/no-unused-vars */}
            {sortedAndFilteredScripts.map((script, index) => (
              <div 
                key={script._id}
                className={`group bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl hover:bg-white/10 transition-all duration-300 ${
                  isListView
                    ? "p-4 flex items-center space-x-4 hover:scale-[1.01] relative"
                    : "p-4 md:p-6 transform hover:scale-[1.02] active:scale-[0.98] relative"
                } ${activeScriptMenu === script._id ? "z-50" : "z-10"}`}
                style={{
                  position:
                    activeScriptMenu === script._id ? "relative" : "relative",
                  zIndex: activeScriptMenu === script._id ? 50 : 10,
                }}
              >
                {isListView ? (
                  <>
                    {/* List View Layout */}
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex-shrink-0 flex items-center justify-center">
                      <FileText className="w-6 h-6 text-white" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div  onClick={() => {
                        router.push("/dashboard/scripts/edit/" + script._id);
                        setActiveScriptMenu(null);
                      }} className="flex-1 min-w-0"> 
                          <h3 className="text-lg font-semibold text-white group-hover:text-purple-400 transition-colors truncate">
                            {script.title}
                          </h3>
                          <p className="text-gray-400 text-sm line-clamp-1 mb-2">
                            {script.content}
                          </p>
                          <div className="flex items-center space-x-4 text-xs text-gray-500">
                            <span className="flex items-center space-x-1">
                              <Clock className="w-3 h-3" />
                              <span>{script.estimatedDuration}m</span>
                            </span>
                            {script.aiGenerated && (
                              <span className="flex items-center space-x-1 text-purple-400">
                                <Sparkles className="w-3 h-3" />
                                <span>AI</span>
                              </span>
                            )}
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-500/20 text-purple-300">
                              {script.templateType}
                            </span>
                            <span>{script.created}</span>
                          </div>
                        </div>

                        {/* Action Menu */}
                        <div className="ml-4 flex-shrink-0">
                          <button
                            onClick={() => toggleScriptMenu(script._id)}
                            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                          >
                            <MoreVertical className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Tile View Layout (Original) */}
                    <div className="absolute top-4 right-4 z-10">
                      <button
                        onClick={() => toggleScriptMenu(script._id)}
                        className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all md:opacity-0 md:group-hover:opacity-100"
                      >
                        <MoreVertical className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="pr-12">
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="text-lg font-bold text-white group-hover:text-purple-400 transition-colors line-clamp-2">
                          {script.title}
                        </h3>
                      </div>

                      <p className="text-gray-400 text-sm mb-4 line-clamp-2 leading-relaxed">
                        {script.content}
                      </p>

                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center space-x-4">
                          <span className="flex items-center space-x-1 text-gray-500">
                            <Clock className="w-4 h-4" />
                            <span>{script.estimatedDuration}m</span>
                          </span>
                          {script.aiGenerated && (
                            <span className="flex items-center space-x-1 text-purple-400">
                              <Sparkles className="w-4 h-4" />
                              <span className="hidden sm:inline">AI</span>
                            </span>
                          )}
                        </div>
                        <span className="text-gray-500 text-xs">
                          {script.created}
                        </span>
                      </div>

                      <div className="mt-3">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-purple-500/20 text-purple-300">
                          {script.templateType}
                        </span>
                      </div>
                    </div>
                  </>
                )}

                {/* Dropdown Menu */}
                {activeScriptMenu === script._id && (
                  <div
                    className={`absolute ${
                      isListView ? "right-4 top-16" : "right-0 top-12"
                    } bg-gray-800/95 backdrop-blur-sm border border-white/20 rounded-xl shadow-lg py-2 min-w-[140px] z-30`}
                  >
                    <button
                      onClick={() => {
                        router.push("/dashboard/scripts/edit/" + script._id);
                        setActiveScriptMenu(null);
                      }}
                      className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
                    >
                      <Edit3 className="w-4 h-4" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => deleteScript(script._id)}
                      className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-gray-300 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Delete</span>
                    </button>
                    <button
                      onClick={() => handleProceedToRecording(script._id)}
                      className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-gray-300 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <Video className="w-4 h-4" />
                      <span>Record</span>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!scriptsLoading &&
          sortedAndFilteredScripts.length === 0 &&
          !scriptsError && (
            <div className="text-center py-16">
              <FileText className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-400 mb-2">
                No scripts found
              </h3>
              <p className="text-gray-500 mb-6">
                Try adjusting your search or create a new script
              </p>
              <button
                onClick={() => router.push("/new")}
                className="bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-3 rounded-xl font-semibold hover:shadow-lg hover:shadow-purple-500/25 transition-all duration-300 transform hover:scale-105"
              >
                Create Your First Script
              </button>
            </div>
          )}
      </div>

      {/* Click outside handler for dropdowns */}
      {(activeScriptMenu || showSortDropdown) && (
        <div
          className="fixed inset-0 z-20"
          onClick={(e) => {
            // Only close if clicking on the backdrop itself, not on child elements
            if (e.target === e.currentTarget) {
              setActiveScriptMenu(null);
              setShowSortDropdown(false);
            }
          }}
        />
      )}
    </div>
  );
};

export default ScriptsTab;
