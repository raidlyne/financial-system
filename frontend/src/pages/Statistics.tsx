import React, { useEffect, useState, useMemo } from "react";
import { Card, Select, Typography, Table, Spin, Empty, Flex } from "antd";
import { PieChart, Pie, ResponsiveContainer, Legend } from "recharts";
import { statisticsApi, type CategoryStat } from "../api/statistics";

const { Title, Text } = Typography;

const COLORS = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#AF19FF",
  "#FF4560",
  "#FF6384",
  "#36A2EB",
];

const Statistics: React.FC = () => {
  const [period, setPeriod] = useState<string>("all");
  const [data, setData] = useState<CategoryStat[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadStats = async () => {
      setLoading(true);
      try {
        const response = await statisticsApi.getStatistics(period);
        setData(response.data.categories);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    loadStats();
  }, [period]);

  const periodOptions = [
    { value: "all", label: "За все время" },
    { value: "week", label: "За неделю" },
    { value: "month", label: "За месяц" },
    { value: "halfyear", label: "За полгода" },
    { value: "year", label: "За год" },
  ];

  const { totalAmount, chartData } = useMemo(() => {
    const total = data.reduce((sum, item) => sum + item.totalSpent, 0);
    const chart = data.map((item, index) => ({
      name: item.categoryName,
      value: item.totalSpent,
      percent: total > 0 ? item.totalSpent / total : 0,
      fill: COLORS[index % COLORS.length],
    }));
    return { totalAmount: total, chartData: chart };
  }, [data]);

  const renderLegend = (props: any) => {
    const { payload } = props;
    return (
      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {payload?.map((entry: any, index: number) => (
          <li key={`item-${index}`} style={{ marginBottom: 8 }}>
            <span
              style={{
                display: "inline-block",
                width: 12,
                height: 12,
                backgroundColor: entry.color,
                marginRight: 8,
                borderRadius: 2,
              }}
            />
            <span style={{ fontSize: 14 }}>{entry.value}</span>
            <span style={{ marginLeft: 8, color: "#888" }}>
              (
              {chartData[index]?.percent
                ? `${(chartData[index].percent! * 100).toFixed(1)}%`
                : "0%"}
              )
            </span>
          </li>
        ))}
      </ul>
    );
  };

  const columns = [
    {
      title: "Категория",
      dataIndex: "categoryName",
      key: "categoryName",
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: "Потрачено",
      dataIndex: "totalSpent",
      key: "totalSpent",
      align: "right" as const,
      render: (amount: number) => <Text>{amount.toLocaleString()} ₽</Text>,
      sorter: (a: CategoryStat, b: CategoryStat) => a.totalSpent - b.totalSpent,
    },
    {
      title: "Доля",
      key: "percent",
      align: "right" as const,
      render: (_: any, record: CategoryStat) => {
        if (totalAmount === 0) return "0%";
        const percent = ((record.totalSpent / totalAmount) * 100).toFixed(1);
        return `${percent}%`;
      },
    },
  ];

  return (
    <div style={{ padding: "24px" }}>
      <Flex justify="space-between" align="center" style={{ marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0 }}>
          Статистика расходов
        </Title>
        <Select
          value={period}
          onChange={(value) => setPeriod(value)}
          options={periodOptions}
          style={{ width: 200 }}
          size="large"
        />
      </Flex>

      {loading ? (
        <div style={{ textAlign: "center", padding: "50px" }}>
          <Spin size="large" description="Загрузка статистики..." />
        </div>
      ) : data.length === 0 ? (
        <Empty description="Нет данных за выбранный период" />
      ) : (
        <Flex gap="large" wrap="wrap">
          <Card
            title="Распределение по категориям"
            style={{ flex: 1, minWidth: 300 }}
          >
            <div style={{ width: "100%", height: 550 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={chartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={120}
                    label={({ name, percent }) => {
                      const pct = percent ? (percent * 100).toFixed(0) : "0";
                      return `${name} ${pct}%`;
                    }}
                    labelLine={{ stroke: "#888", strokeWidth: 1 }}
                  ></Pie>
                  <Legend content={renderLegend} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card
            title={`Итого за период: ${totalAmount.toLocaleString()} ₽`}
            style={{ flex: 1, minWidth: 300 }}
          >
            <Table
              dataSource={data}
              columns={columns}
              rowKey={(record) =>
                record.categoryId?.toString() || record.categoryName
              }
              pagination={false}
              bordered
              size="middle"
            />
          </Card>
        </Flex>
      )}
    </div>
  );
};

export default Statistics;
