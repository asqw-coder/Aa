import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Transaction {
  id: string;
  name: string;
  type: string;
  amount: string;
  date: string;
  isPositive?: boolean;
}

interface TransactionListProps {
  transactions: Transaction[];
  title: string;
}

export const TransactionList = ({ transactions, title }: TransactionListProps) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        <button className="text-sm text-primary hover:underline">
          See All
        </button>
      </div>
      
      <ScrollArea className="h-48">
        <div className="space-y-3">
          {transactions.map((transaction) => (
            <div key={transaction.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                    {transaction.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium text-foreground">{transaction.name}</p>
                  <p className="text-xs text-muted-foreground">{transaction.type}</p>
                </div>
              </div>
              <div className="text-right">
                <p className={`text-sm font-medium ${
                  transaction.isPositive ? 'text-success' : 'text-destructive'
                }`}>
                  {transaction.isPositive ? '+' : ''}{transaction.amount}
                </p>
                <p className="text-xs text-muted-foreground">{transaction.date}</p>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};