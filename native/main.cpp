#include <RE/Skyrim.h>
#include <SKSE/SKSE.h>

namespace {
    std::int32_t GetVersion(RE::StaticFunctionTag*) { return 1; }

    bool RegisterPapyrus(RE::BSScript::IVirtualMachine* vm)
    {
        vm->RegisterFunction("GetVersion", "LivingPastCatalog", GetVersion);
        SKSE::log::info("LivingPastCatalog Papyrus function registered");
        return true;
    }
}

SKSEPluginLoad(const SKSE::LoadInterface* skse)
{
    SKSE::Init(skse);
    auto logDir = SKSE::log::log_directory();
    if (logDir) {
        auto sink = std::make_shared<spdlog::sinks::basic_file_sink_mt>((*logDir / "LivingPastCatalog.log").string(), true);
        spdlog::set_default_logger(std::make_shared<spdlog::logger>("LivingPastCatalog", std::move(sink)));
        spdlog::set_level(spdlog::level::info);
        spdlog::flush_on(spdlog::level::info);
    }
    SKSE::log::info("LivingPastCatalog initializing");
    return SKSE::GetPapyrusInterface()->Register(RegisterPapyrus);
}
