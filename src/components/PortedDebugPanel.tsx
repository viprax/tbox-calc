import { PortedCompareChart } from "./PortedCompareCharts";
import type { PortedParams } from "../core/portedResponse";

/** Отдельный инструмент разработчика; не подключён к обычному калькулятору. */
export function PortedDebugPanel({ params }: { params: PortedParams }) {
    return <PortedCompareChart params={params} debug />;
}
